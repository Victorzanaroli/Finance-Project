/**
 * src/adapters/repositories/TransactionRepositorySQLite.ts
 *
 * Camada: Adapters — Implementação concreta de ITransactionRepository.
 *
 * RESPONSABILIDADE: Traduzir entre a linguagem do domínio (entidade Transaction)
 * e a linguagem do banco de dados (linhas do Drizzle/SQLite).
 *
 * Este é o ÚNICO arquivo que importa Drizzle ORM e o schema de banco de dados
 * para operações de Transaction. O domínio e os casos de uso não sabem
 * que isso existe — eles só conhecem a interface ITransactionRepository.
 *
 * Padrão SKILL.md seção 10:
 *  "Repository: interface no domínio, implementação SQLite/Drizzle na infra."
 */

import { eq, and, like, sql } from "drizzle-orm";
import { db } from "../../infra/db/client";
import { transactions } from "../../infra/db/schema";
import type { NewTransactionRow, TransactionRow } from "../../infra/db/schema";
import { Transaction } from "../../domain/entities/Transaction";
import type {
  ITransactionRepository,
  TransactionFilters,
} from "../../domain/repositories/ITransactionRepository";
import type { SyncStatus } from "../../domain/entities/Transaction";

// ─────────────────────────────────────────────────────────────────────────────
// Funções de mapeamento (schema ↔ domínio)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converte linha do banco de dados (snake_case) para entidade de domínio (camelCase).
 * Isola o knowledge do schema físico dentro do adapter.
 */
function rowToEntity(row: TransactionRow): Transaction {
  return Transaction.reconstituir({
    id: row.id,
    title: row.title,
    amount: row.amount,
    type: row.type as "income" | "expense",
    category: row.category,
    isFixed: Boolean(row.is_fixed),
    date: row.date,
    syncStatus: row.sync_status as SyncStatus,
    updatedAt: row.updated_at,
  });
}

/**
 * Converte entidade de domínio para o formato de inserção/atualização do Drizzle.
 */
function entityToRow(transaction: Transaction): NewTransactionRow {
  return {
    id: transaction.id,
    title: transaction.title,
    amount: transaction.amount,
    type: transaction.type,
    category: transaction.category,
    is_fixed: transaction.isFixed,
    date: transaction.date,
    sync_status: transaction.syncStatus,
    updated_at: transaction.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementação
// ─────────────────────────────────────────────────────────────────────────────

export class TransactionRepositorySQLite implements ITransactionRepository {
  async salvar(transaction: Transaction): Promise<void> {
    await db.insert(transactions).values(entityToRow(transaction));
  }

  async atualizar(transaction: Transaction): Promise<void> {
    await db
      .update(transactions)
      .set(entityToRow(transaction))
      .where(eq(transactions.id, transaction.id));
  }

  async buscarTodas(filters?: TransactionFilters): Promise<Transaction[]> {
    // Construção dinâmica de condições — Drizzle usa composição funcional.
    const conditions = [];

    if (filters?.type) {
      conditions.push(eq(transactions.type, filters.type));
    }
    if (filters?.isFixed !== undefined) {
      conditions.push(eq(transactions.is_fixed, filters.isFixed));
    }
    if (filters?.syncStatus) {
      conditions.push(eq(transactions.sync_status, filters.syncStatus));
    }
    if (filters?.month) {
      // Filtro por mês: date LIKE 'YYYY-MM%'
      conditions.push(like(transactions.date, `${filters.month}%`));
    }

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(transactions)
            .where(and(...conditions))
            .orderBy(sql`${transactions.date} DESC`)
        : await db
            .select()
            .from(transactions)
            .orderBy(sql`${transactions.date} DESC`);

    return rows.map(rowToEntity);
  }

  async buscarPorSyncStatus(status: SyncStatus): Promise<Transaction[]> {
    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.sync_status, status));
    return rows.map(rowToEntity);
  }

  async buscarPorId(id: string): Promise<Transaction | undefined> {
    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);
    if (rows.length === 0) return undefined;
    return rowToEntity(rows[0]);
  }

  async deletar(id: string): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  async deletarTodas(): Promise<void> {
    await db.delete(transactions);
  }
}
