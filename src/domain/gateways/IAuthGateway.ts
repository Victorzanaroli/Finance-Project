/**
 * src/domain/gateways/IAuthGateway.ts
 *
 * Camada: Domínio — Porta (Interface) para Autenticação e Conta do Usuário.
 *
 * REGRA ABSOLUTA: Interface pura — sem import de Supabase ou Expo SecureStore.
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUri: string | null;
  cloudSyncEnabled: boolean;
  isAuthenticated: boolean;
  authMode: "supabase" | "local";
}

export interface IAuthGateway {
  obterPerfilAtual(): Promise<UserProfile>;
  entrar(email: string, senha: string): Promise<UserProfile>;
  cadastrar(nome: string, email: string, senha: string): Promise<UserProfile>;
  atualizarPerfil(dados: Partial<Pick<UserProfile, "name" | "email" | "avatarUri" | "cloudSyncEnabled">>): Promise<UserProfile>;
  sair(): Promise<UserProfile>;
}
