/**
 * src/adapters/gateways/auth/AuthGatewaySupabaseLocal.ts
 *
 * Camada: Adapters — Implementação Offline-First do IAuthGateway.
 *
 * Como funciona:
 *  - Persiste os dados da conta localmente em `expo-secure-store` (funciona 100%
 *    offline para que o usuário possa definir seu nome, e-mail, foto e usar o app
 *    sem internet).
 *  - Quando o projeto Supabase está configurado em `EXPO_PUBLIC_SUPABASE_URL`,
 *    autentica também via `supabase.auth` (`signInWithPassword`, `signUp`, `signOut`)
 *    para vincular os lançamentos ao `user_id` na nuvem.
 *  - Possui sistema de notificação em memória (`subscribe`) para que todas as telas
 *    (como o "Olá, [Nome]!" no Dashboard) atualizem instantaneamente.
 */

import * as SecureStore from "expo-secure-store";
import type { IAuthGateway, UserProfile } from "../../../domain/gateways/IAuthGateway";
import { supabase } from "../../../infra/supabase/client";

const STORAGE_KEY = "financas_user_profile_v1";

const DEFAULT_PROFILE: UserProfile = {
  id: "local-default-user",
  name: "Victor",
  email: "",
  avatarUri: null,
  cloudSyncEnabled: false,
  isAuthenticated: false,
  authMode: "local",
};

type ProfileListener = (profile: UserProfile) => void;

export class AuthGatewaySupabaseLocal implements IAuthGateway {
  private cachedProfile: UserProfile | null = null;
  private listeners = new Set<ProfileListener>();

  subscribe(listener: ProfileListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(profile: UserProfile) {
    this.cachedProfile = profile;
    for (const listener of this.listeners) {
      listener(profile);
    }
  }

  private isSupabaseConfigured(): boolean {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://seu-projeto.supabase.co";
    return Boolean(url) && !url.includes("seu-projeto.supabase.co") && !url.includes("placeholder");
  }

  private async salvarLocal(profile: UserProfile): Promise<UserProfile> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignora erro caso SecureStore não esteja disponível no ambiente web/teste
    }
    this.notify(profile);
    return profile;
  }

  async obterPerfilAtual(): Promise<UserProfile> {
    if (this.cachedProfile) {
      return this.cachedProfile;
    }

    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserProfile;
        this.cachedProfile = { ...DEFAULT_PROFILE, ...parsed };
        return this.cachedProfile;
      }
    } catch {
      // Fallback para DEFAULT_PROFILE
    }

    this.cachedProfile = { ...DEFAULT_PROFILE };
    return this.cachedProfile;
  }

  async entrar(email: string, senha: string): Promise<UserProfile> {
    const emailLimpo = email.trim().toLowerCase();
    if (!emailLimpo || !emailLimpo.includes("@")) {
      throw new Error("Informe um e-mail válido.");
    }
    if (!senha || senha.length < 4) {
      throw new Error("A senha deve ter pelo menos 4 caracteres.");
    }

    const atual = await this.obterPerfilAtual();

    if (this.isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailLimpo,
        password: senha,
      });

      if (error) {
        throw new Error(error.message);
      }

      const nomeMeta =
        (data.user?.user_metadata?.full_name as string) ||
        atual.name ||
        emailLimpo.split("@")[0];

      return this.salvarLocal({
        id: data.user?.id ?? `user-${Date.now()}`,
        name: nomeMeta,
        email: emailLimpo,
        avatarUri: atual.avatarUri,
        cloudSyncEnabled: true,
        isAuthenticated: true,
        authMode: "supabase",
      });
    }

    // Modo Offline-First Local
    const nomeSugerido =
      atual.name && atual.name !== "Visitante"
        ? atual.name
        : emailLimpo.split("@")[0].replace(/^\w/, (c) => c.toUpperCase());

    return this.salvarLocal({
      id: `local-${emailLimpo}`,
      name: nomeSugerido,
      email: emailLimpo,
      avatarUri: atual.avatarUri,
      cloudSyncEnabled: atual.cloudSyncEnabled,
      isAuthenticated: true,
      authMode: "local",
    });
  }

  async cadastrar(nome: string, email: string, senha: string): Promise<UserProfile> {
    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();

    if (!nomeLimpo) {
      throw new Error("Informe seu nome para personalizar o aplicativo.");
    }
    if (!emailLimpo || !emailLimpo.includes("@")) {
      throw new Error("Informe um e-mail válido.");
    }
    if (!senha || senha.length < 4) {
      throw new Error("Crie uma senha de pelo menos 4 caracteres.");
    }

    const atual = await this.obterPerfilAtual();

    if (this.isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signUp({
        email: emailLimpo,
        password: senha,
        options: {
          data: { full_name: nomeLimpo },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      return this.salvarLocal({
        id: data.user?.id ?? `user-${Date.now()}`,
        name: nomeLimpo,
        email: emailLimpo,
        avatarUri: atual.avatarUri,
        cloudSyncEnabled: true,
        isAuthenticated: true,
        authMode: "supabase",
      });
    }

    // Modo Offline-First Local
    return this.salvarLocal({
      id: `local-${Date.now()}`,
      name: nomeLimpo,
      email: emailLimpo,
      avatarUri: atual.avatarUri,
      cloudSyncEnabled: false,
      isAuthenticated: true,
      authMode: "local",
    });
  }

  async atualizarPerfil(
    dados: Partial<Pick<UserProfile, "name" | "email" | "avatarUri" | "cloudSyncEnabled">>
  ): Promise<UserProfile> {
    const atual = await this.obterPerfilAtual();
    const atualizado: UserProfile = {
      ...atual,
      ...dados,
      name: dados.name !== undefined ? dados.name.trim() || atual.name : atual.name,
    };
    return this.salvarLocal(atualizado);
  }

  async sair(): Promise<UserProfile> {
    if (this.isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignora erro de rede ao deslogar offline
      }
    }

    return this.salvarLocal({
      id: "local-guest",
      name: "Visitante",
      email: "",
      avatarUri: null,
      cloudSyncEnabled: false,
      isAuthenticated: false,
      authMode: "local",
    });
  }
}

export const authGateway = new AuthGatewaySupabaseLocal();
