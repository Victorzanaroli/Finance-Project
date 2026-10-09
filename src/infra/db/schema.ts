/**
 * src/infra/db/schema.ts
 *
 * Camada: Infraestrutura — Schema Drizzle ORM para SQLite local.
 *
 * REGRA: Este arquivo é a ÚNICA camada que conhece a estrutura física das tabelas.
 * O domínio (src/domain/) jamais importa daqui — ele trabalha com interfaces e
 * entidades puras. Somente os adapters de repositório (src/adapters/repositories/)
 * importam este schema para fazer o mapeamento ORM → Entidade de Domínio.
 *
 * Decisões de design (rastreáveis ao SKILL.md seção 3.1):
 *  - id: UUID string gerado no cliente (não autoincrement) — evita colisão offline.
 *  - sync_status: 'pending' | 'synced' | 'error' — máquina de estados de sync (seção 5).
 *  - updated_at: integer (Unix ms) — critério de resolução de conflito last-write-wins.
 *  - is_fixed: boolean como integer (0/1) — limitação do SQLite.
 */

import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ─────────────────────────────────────────────────────────────────────────────
// Tabela: transactions
// Entidade de domínio correspondente: Transaction (src/domain/entities/)
// ─────────────────────────────────────────────────────────────────────────────
export const transactions = sqliteTable("transactions", {
  /** UUID gerado no cliente — evita colisão ao criar offline. */
  id: text("id").primaryKey().notNull(),

  /** Descrição curta da transação (ex: "Salário", "Aluguel"). */
  title: text("title").notNull(),

  /** Valor em moeda. Sempre positivo; o campo `type` define direção. */
  amount: real("amount").notNull(),

  /**
   * Direção da transação:
   *   'income'  → entrada de dinheiro (receita)
   *   'expense' → saída de dinheiro (despesa)
   */
  type: text("type", { enum: ["income", "expense"] }).notNull(),

  /** Categoria livre (ex: "Alimentação", "Moradia", "Lazer"). */
  category: text("category").notNull(),

  /**
   * Indica se é despesa/receita fixa (recorrente mensalmente).
   * SQLite não tem boolean nativo; armazenamos 0 ou 1.
   */
  is_fixed: integer("is_fixed", { mode: "boolean" }).notNull().default(false),

  /**
   * Indica se é uma previsão (estimativa).
   */
  is_forecast: integer("is_forecast", { mode: "boolean" }).notNull().default(false),

  /**
   * Dia da recorrência para transações fixas (ex: "15" ou "quinto_dia_util").
   */
  recurrence_day: text("recurrence_day"),

  /** Data no formato ISO 8601 (ex: "2024-01-15"). */
  date: text("date").notNull(),

  /**
   * Estado de sincronização com o backend Supabase.
   * Máquina de estados: pending → synced | error → pending (retry).
   * Recém-criados sempre entram como 'pending'.
   */
  sync_status: text("sync_status", {
    enum: ["pending", "synced", "error"],
  })
    .notNull()
    .default("pending"),

  /**
   * Timestamp Unix em milissegundos da última modificação.
   * Usado como critério de resolução de conflito (last-write-wins).
   */
  updated_at: integer("updated_at").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Tabela: goals  (Caixinhas de Poupança)
// Entidade de domínio correspondente: Goal (src/domain/entities/)
// ─────────────────────────────────────────────────────────────────────────────
export const goals = sqliteTable("goals", {
  /** UUID gerado no cliente. */
  id: text("id").primaryKey().notNull(),

  /** Nome da meta (ex: "Viagem para Europa", "Fundo de Emergência"). */
  title: text("title").notNull(),

  /** Valor alvo em moeda. */
  target_amount: real("target_amount").notNull(),

  /** Valor atual acumulado. Começa em 0. */
  current_amount: real("current_amount").notNull().default(0),

  /**
   * Cor hexadecimal para identificação visual da caixinha na UI.
   * Ex: "#7c3aed" (purple-600), "#22d3ee" (cyan-400).
   */
  color_hex: text("color_hex").notNull().default("#7c3aed"),

  /** Estado de sincronização — mesma máquina de estados de transactions. */
  sync_status: text("sync_status", {
    enum: ["pending", "synced", "error"],
  })
    .notNull()
    .default("pending"),

  /** Timestamp de última modificação para last-write-wins. */
  updated_at: integer("updated_at").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Tipos inferidos pelo TypeScript a partir do schema
// Usados pelos adapters de repositório para tipagem do retorno do ORM.
// ─────────────────────────────────────────────────────────────────────────────
export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
export type GoalRow = typeof goals.$inferSelect;
export type NewGoalRow = typeof goals.$inferInsert;
