/**
 * src/adapters/gateways/sync/SyncGatewaySupabase.ts
 *
 * Camada: Adapters — Implementação do ISyncGateway usando Supabase.
 *
 * ESTE É O ÚNICO ARQUIVO que importa @supabase/supabase-js para operações de sync.
 * O domínio e casos de uso não sabem que Supabase existe — eles usam ISyncGateway.
 *
 * Estratégia: UPSERT — se o registro já existe no Supabase, atualiza;
 * se não existe, insere. Resolve idempotência em caso de retry.
 */

import { supabase } from "../../../infra/supabase/client";
import type { ISyncGateway, SyncResult } from "../../../domain/gateways/ISyncGateway";
import type { Transaction } from "../../../domain/entities/Transaction";
import type { Goal } from "../../../domain/entities/Goal";

export class SyncGatewaySupabase implements ISyncGateway {
  async sincronizarTransaction(transaction: Transaction): Promise<SyncResult> {
    try {
      const { error } = await supabase.from("transactions").upsert({
        id: transaction.id,
        title: transaction.title,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        is_fixed: transaction.isFixed,
        date: transaction.date,
        updated_at: new Date(transaction.updatedAt).toISOString(),
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      };
    }
  }

  async sincronizarGoal(goal: Goal): Promise<SyncResult> {
    try {
      const { error } = await supabase.from("goals").upsert({
        id: goal.id,
        title: goal.title,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        color_hex: goal.colorHex,
        updated_at: new Date(goal.updatedAt).toISOString(),
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      };
    }
  }

  async deletarTransactionRemota(id: string): Promise<SyncResult> {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      };
    }
  }
}
