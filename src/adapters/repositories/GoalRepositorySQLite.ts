/**
 * src/adapters/repositories/GoalRepositorySQLite.ts
 *
 * Camada: Adapters — Implementação concreta de IGoalRepository.
 */

import { eq } from "drizzle-orm";
import { db } from "../../infra/db/client";
import { goals } from "../../infra/db/schema";
import type { NewGoalRow, GoalRow } from "../../infra/db/schema";
import { Goal } from "../../domain/entities/Goal";
import type { IGoalRepository } from "../../domain/repositories/IGoalRepository";
import type { SyncStatus } from "../../domain/entities/Transaction";

function rowToEntity(row: GoalRow): Goal {
  return Goal.reconstituir({
    id: row.id,
    title: row.title,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount,
    colorHex: row.color_hex,
    syncStatus: row.sync_status as SyncStatus,
    updatedAt: row.updated_at,
  });
}

function entityToRow(goal: Goal): NewGoalRow {
  return {
    id: goal.id,
    title: goal.title,
    target_amount: goal.targetAmount,
    current_amount: goal.currentAmount,
    color_hex: goal.colorHex,
    sync_status: goal.syncStatus,
    updated_at: goal.updatedAt,
  };
}

export class GoalRepositorySQLite implements IGoalRepository {
  async salvar(goal: Goal): Promise<void> {
    await db.insert(goals).values(entityToRow(goal));
  }

  async atualizar(goal: Goal): Promise<void> {
    await db
      .update(goals)
      .set(entityToRow(goal))
      .where(eq(goals.id, goal.id));
  }

  async buscarTodas(): Promise<Goal[]> {
    const rows = await db.select().from(goals);
    return rows.map(rowToEntity);
  }

  async buscarPorSyncStatus(status: SyncStatus): Promise<Goal[]> {
    const rows = await db
      .select()
      .from(goals)
      .where(eq(goals.sync_status, status));
    return rows.map(rowToEntity);
  }

  async buscarPorId(id: string): Promise<Goal | undefined> {
    const rows = await db
      .select()
      .from(goals)
      .where(eq(goals.id, id))
      .limit(1);
    if (rows.length === 0) return undefined;
    return rowToEntity(rows[0]);
  }

  async deletar(id: string): Promise<void> {
    await db.delete(goals).where(eq(goals.id, id));
  }

  async deletarTodas(): Promise<void> {
    await db.delete(goals);
  }
}
