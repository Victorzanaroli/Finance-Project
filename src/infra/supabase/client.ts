/**
 * src/infra/supabase/client.ts
 *
 * Camada: Infraestrutura — Setup do cliente Supabase.
 *
 * REGRA: Este arquivo é o ÚNICO ponto de criação do cliente supabase-js.
 * Somente os adapters de gateway (src/adapters/gateways/sync/, auth/) importam daqui.
 * O domínio e os casos de uso NUNCA importam este módulo.
 *
 * Segurança:
 *  - A ANON KEY é pública por design (usada no client-side do Supabase).
 *  - Row Level Security (RLS) é a camada de autorização — ver políticas no README.
 *  - Tokens de sessão são persistidos em expo-secure-store (nunca AsyncStorage).
 *
 * RLS Policies (documentação — implementar no painel do Supabase):
 *  transactions: user_id = auth.uid() para SELECT, INSERT, UPDATE, DELETE
 *  goals:        user_id = auth.uid() para SELECT, INSERT, UPDATE, DELETE
 */

import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

// ─────────────────────────────────────────────────────────────────────────────
// Configuração — substitua pelas variáveis do seu projeto Supabase.
// Em produção, use variáveis de ambiente (expo-constants + eas.json secrets).
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://seu-projeto.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "sua-anon-key";

/**
 * Adapter de storage para expo-secure-store.
 * O supabase-js usa este adapter para persistir tokens de autenticação
 * de forma segura no Keychain (iOS) ou Keystore (Android).
 *
 * Referência SKILL.md seção 1 (RNF de segurança):
 *   "token de sessão em expo-secure-store (nunca AsyncStorage puro pra credencial)"
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

/**
 * Cliente Supabase configurado com storage seguro.
 * Exportado para uso exclusivo nos adapters de gateway.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // necessário em React Native (sem browser)
  },
});
