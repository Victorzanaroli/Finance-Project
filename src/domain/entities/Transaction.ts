/**
 * src/domain/entities/Transaction.ts
 *
 * Camada: Domínio — Entidade de domínio Transaction.
 *
 * REGRA ABSOLUTA: Nenhum import de biblioteca externa aqui.
 * Esta entidade é um objeto puro TypeScript — testável sem mocks,
 * sem Expo, sem Supabase, sem Drizzle.
 *
 * Rastreabilidade:
 *  - RF: RegistrarTransacao, EditarTransacao
 *  - SKILL.md seção 3: atributos de sync (id UUID, sync_status, updated_at)
 *  - SKILL.md seção 5: máquina de estados de sincronização
 */

import { dataISOValida } from "../value-objects/DataFinanceira";
import { transicionarSyncStatus, type SyncStatus } from "../value-objects/SyncStatus";

// ─────────────────────────────────────────────────────────────────────────────
// Value Objects (tipos simples promovidos a tipos nomeados para expressar
// intenção no domínio — rastreável ao SKILL.md seção 10/DDD)
// ─────────────────────────────────────────────────────────────────────────────

/** Direção do fluxo financeiro. */
export type TransactionType = "income" | "expense";

/**
 * Estado de sincronização com o backend.
 * Definido em value-objects/SyncStatus.ts (re-exportado aqui por compatibilidade).
 */
export type { SyncStatus };

// ─────────────────────────────────────────────────────────────────────────────
// Entidade de Domínio
// ─────────────────────────────────────────────────────────────────────────────

/** Props necessárias para reconstituir uma Transaction a partir do repositório. */
export interface TransactionProps {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  isFixed: boolean;
  recurrenceDay?: string | null;
  isForecast?: boolean;
  date: string; // ISO 8601: "YYYY-MM-DD"
  syncStatus: SyncStatus;
  updatedAt: number; // Unix timestamp em ms
}

/**
 * Entidade Transaction — representa uma movimentação financeira.
 *
 * Invariantes de domínio:
 *  - amount deve ser > 0 (o type define a direção)
 *  - date deve ser uma string ISO válida
 *  - title não pode ser vazio
 *
 * Decisão: usamos classe (não interface/plain object) para encapsular
 * as transições de estado (marcarPendente, marcarSincronizado) e
 * garantir que invariantes sejam verificados na construção.
 */
export class Transaction {
  readonly id: string;
  readonly title: string;
  readonly amount: number;
  readonly type: TransactionType;
  readonly category: string;
  readonly isFixed: boolean;
  readonly recurrenceDay: string | null;
  readonly isForecast: boolean;
  readonly date: string;
  readonly syncStatus: SyncStatus;
  readonly updatedAt: number;

  private constructor(props: TransactionProps) {
    this.id = props.id;
    this.title = props.title;
    this.amount = props.amount;
    this.type = props.type;
    this.category = props.category;
    this.isFixed = props.isFixed;
    this.recurrenceDay = props.recurrenceDay ?? null;
    this.isForecast = props.isForecast ?? false;
    this.date = props.date;
    this.syncStatus = props.syncStatus;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Factory method para criar uma nova Transaction já com validações.
   * Usado pelo RegistrarTransacaoUseCase.
   */
  static criar(props: Omit<TransactionProps, "syncStatus" | "updatedAt">): Transaction {
    if (!props.title || props.title.trim().length === 0) {
      throw new Error("Transaction: title não pode ser vazio.");
    }
    if (!props.category || props.category.trim().length === 0) {
      throw new Error("Transaction: category não pode ser vazia.");
    }
    if (props.type !== "income" && props.type !== "expense") {
      throw new Error("Transaction: type deve ser 'income' ou 'expense'.");
    }
    if (!Number.isFinite(props.amount) || props.amount <= 0) {
      throw new Error("Transaction: amount deve ser maior que zero.");
    }
    if (!props.date || !dataISOValida(props.date)) {
      throw new Error("Transaction: date deve estar no formato ISO YYYY-MM-DD.");
    }

    return new Transaction({
      ...props,
      syncStatus: "pending", // recém-criada sempre entra como pending
      updatedAt: Date.now(),
    });
  }

  /**
   * Factory method para reconstituir uma Transaction a partir do repositório
   * (sem aplicar validações de criação — os dados já foram validados antes).
   */
  static reconstituir(props: TransactionProps): Transaction {
    return new Transaction(props);
  }

  /** Nova edição local: volta para 'pending' e atualiza updatedAt (last-write-wins). */
  marcarPendente(): Transaction {
    return Transaction.reconstituir({
      ...this.toProps(),
      syncStatus: transicionarSyncStatus(this.syncStatus, "pending"),
      updatedAt: Date.now(),
    });
  }

  /** Retry: 'error' → 'pending' SEM alterar updatedAt (o dado não mudou, só será reenviado). */
  reenfileirar(): Transaction {
    return Transaction.reconstituir({
      ...this.toProps(),
      syncStatus: transicionarSyncStatus(this.syncStatus, "pending"),
    });
  }

  /** Confirmação do servidor: 'pending' → 'synced'. */
  marcarSincronizado(): Transaction {
    return Transaction.reconstituir({
      ...this.toProps(),
      syncStatus: transicionarSyncStatus(this.syncStatus, "synced"),
    });
  }

  /** Falha de sync: 'pending' → 'error'. */
  marcarErroSync(): Transaction {
    return Transaction.reconstituir({
      ...this.toProps(),
      syncStatus: transicionarSyncStatus(this.syncStatus, "error"),
    });
  }

  /** Serializa para objeto plano (útil para testes e mapeamento no adapter). */
  toProps(): TransactionProps {
    return {
      id: this.id,
      title: this.title,
      amount: this.amount,
      type: this.type,
      category: this.category,
      isFixed: this.isFixed,
      recurrenceDay: this.recurrenceDay,
      isForecast: this.isForecast,
      date: this.date,
      syncStatus: this.syncStatus,
      updatedAt: this.updatedAt,
    };
  }
}
