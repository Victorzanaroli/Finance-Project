/**
 * src/adapters/hooks/useUserAccount.ts
 *
 * Camada: Adapters — Hook React para gerenciar a Conta do Usuário e Sincronização.
 */

import { useState, useEffect, useCallback } from "react";
import { authGateway } from "../gateways/auth/AuthGatewaySupabaseLocal";
import {
  transactionRepository,
  goalRepository,
  syncGateway,
} from "../composition-root";
import type { UserProfile } from "../../domain/gateways/IAuthGateway";

export function useUserAccount() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    let mounted = true;
    authGateway.obterPerfilAtual().then((perfil) => {
      if (mounted) {
        setUser(perfil);
        setIsLoading(false);
      }
    });

    const unsubscribe = authGateway.subscribe((novoPerfil) => {
      if (mounted) {
        setUser(novoPerfil);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    return authGateway.entrar(email, senha);
  }, []);

  const cadastrar = useCallback(async (nome: string, email: string, senha: string) => {
    return authGateway.cadastrar(nome, email, senha);
  }, []);

  const atualizarPerfil = useCallback(
    async (
      dados: Partial<Pick<UserProfile, "name" | "email" | "avatarUri" | "cloudSyncEnabled">>
    ) => {
      return authGateway.atualizarPerfil(dados);
    },
    []
  );

  const sair = useCallback(async () => {
    return authGateway.sair();
  }, []);

  const recarregarUsuario = useCallback(async () => {
    const perfil = await authGateway.obterPerfilAtual();
    setUser(perfil);
  }, []);

  const sincronizarAgora = useCallback(async (): Promise<{
    sucesso: boolean;
    mensagem: string;
  }> => {
    setSincronizando(true);
    try {
      const [txPendentes, goalsPendentes] = await Promise.all([
        transactionRepository.buscarPorSyncStatus("pending"),
        goalRepository.buscarPorSyncStatus("pending"),
      ]);

      const totalPendentes = txPendentes.length + goalsPendentes.length;
      const supabaseUrl =
        process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://seu-projeto.supabase.co";
      const isSupabaseConfigurado =
        Boolean(supabaseUrl) &&
        !supabaseUrl.includes("seu-projeto.supabase.co") &&
        !supabaseUrl.includes("placeholder");

      if (!isSupabaseConfigurado) {
        return {
          sucesso: true,
          mensagem: `Modo Offline-First ativo: você possui ${totalPendentes} registro(s) salvos com segurança no SQLite local prontos para sincronizar quando conectar seu projeto Supabase.`,
        };
      }

      let enviados = 0;
      for (const tx of txPendentes) {
        const res = await syncGateway.sincronizarTransaction(tx);
        if (res.success) {
          await transactionRepository.atualizar(tx.marcarSincronizado());
          enviados++;
        }
      }

      for (const g of goalsPendentes) {
        const res = await syncGateway.sincronizarGoal(g);
        if (res.success) {
          await goalRepository.atualizar(g.marcarSincronizado());
          enviados++;
        }
      }

      return {
        sucesso: true,
        mensagem: `Sincronização concluída! ${enviados} de ${totalPendentes} registro(s) sincronizados com a nuvem.`,
      };
    } catch (e) {
      return {
        sucesso: false,
        mensagem:
          e instanceof Error
            ? e.message
            : "Não foi possível sincronizar no momento. Seus dados continuam salvos localmente.",
      };
    } finally {
      setSincronizando(false);
    }
  }, []);

  return {
    user,
    isLoading,
    sincronizando,
    entrar,
    cadastrar,
    atualizarPerfil,
    sair,
    sincronizarAgora,
    recarregarUsuario,
  };
}
