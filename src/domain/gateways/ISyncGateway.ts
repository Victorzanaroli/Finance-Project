/**
 * src/domain/gateways/ISyncGateway.ts
 *
 * Camada: Domínio — Interface (Port) do gateway de sincronização com Supabase.
 *
 * REGRA ABSOLUTA: Nenhum import de @supabase/supabase-js aqui.
 * A implementação real (SyncGatewaySupabase) fica em src/adapters/gateways/sync/.
 *
 * Padrão SKILL.md seção 10/DDD:
 *  "Gateway (especialização de porta pra recurso externo não persistente)"
 *
 * Rastreabilidade: SincronizarFilaUseCase.
 */

import type { Transaction } from "../entities/Transaction";
import type { Goal } from "../entities/Goal";

/** Resultado de uma operação de sync individual. */
export interface SyncResult {
  success: boolean;
  error?: string;
}

/**
 * Contrato do gateway de sincronização com o backend.
 *
 * Responsabilidade: transportar dados locais para o Supabase e
 * trazer atualizações remotas. Não conhece SQLite, não conhece Drizzle.
 */
export interface ISyncGateway {
  /**
   * Envia uma Transaction para o Supabase (upsert).
   * Usado pelo SincronizarFilaUseCase ao processar itens 'pending'.
   */
  sincronizarTransaction(transaction: Transaction): Promise<SyncResult>;

  /**
   * Envia uma Goal para o Supabase (upsert).
   */
  sincronizarGoal(goal: Goal): Promise<SyncResult>;

  /**
   * Deleta uma Transaction no servidor (chamado antes do delete local em soft-delete flow).
   */
  deletarTransactionRemota(id: string): Promise<SyncResult>;
}
