/**
 * src/domain/entities/Goal.ts
 *
 * Camada: Domínio — Entidade de domínio Goal (Caixinha de Poupança).
 *
 * REGRA ABSOLUTA: Nenhum import de biblioteca externa aqui.
 * Objeto puro TypeScript.
 *
 * Rastreabilidade:
 *  - RF: CriarCaixinha, DepositarNaCaixinha, ConsultarCaixinhas
 *  - SKILL.md seção 3: atributos de sync (id UUID, sync_status, updated_at)
 */

import { transicionarSyncStatus, type SyncStatus } from "../value-objects/SyncStatus";

const COR_HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface GoalProps {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  colorHex: string;
  syncStatus: SyncStatus;
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Entidade de Domínio
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Entidade Goal — representa uma "caixinha" (meta de poupança).
 *
 * Invariantes de domínio:
 *  - targetAmount deve ser > 0
 *  - currentAmount não pode ser negativo
 *  - currentAmount não pode exceder targetAmount
 *  - colorHex deve ser uma cor hexadecimal válida
 */
export class Goal {
  readonly id: string;
  readonly title: string;
  readonly targetAmount: number;
  readonly currentAmount: number;
  readonly colorHex: string;
  readonly syncStatus: SyncStatus;
  readonly updatedAt: number;

  private constructor(props: GoalProps) {
    this.id = props.id;
    this.title = props.title;
    this.targetAmount = props.targetAmount;
    this.currentAmount = props.currentAmount;
    this.colorHex = props.colorHex;
    this.syncStatus = props.syncStatus;
    this.updatedAt = props.updatedAt;
  }

  /** Factory method para criar uma nova caixinha. */
  static criar(
    props: Omit<GoalProps, "currentAmount" | "syncStatus" | "updatedAt"> & {
      currentAmount?: number;
    }
  ): Goal {
    if (!props.title || props.title.trim().length === 0) {
      throw new Error("Goal: title não pode ser vazio.");
    }
    if (!Number.isFinite(props.targetAmount) || props.targetAmount <= 0) {
      throw new Error("Goal: targetAmount deve ser maior que zero.");
    }
    const currentAmount = props.currentAmount ?? 0;
    if (currentAmount < 0) {
      throw new Error("Goal: currentAmount não pode ser negativo.");
    }
    if (currentAmount > props.targetAmount) {
      throw new Error("Goal: currentAmount não pode exceder targetAmount.");
    }
    if (!COR_HEX_REGEX.test(props.colorHex)) {
      throw new Error("Goal: colorHex deve ser uma cor hexadecimal no formato #RRGGBB.");
    }

    return new Goal({
      ...props,
      currentAmount,
      syncStatus: "pending",
      updatedAt: Date.now(),
    });
  }

  /** Factory method para reconstituir do repositório. */
  static reconstituir(props: GoalProps): Goal {
    return new Goal(props);
  }

  /**
   * Deposita um valor na caixinha.
   * Retorna nova instância (imutabilidade) sem exceder targetAmount.
   * @throws Error se valor <= 0 ou se a meta já foi atingida.
   */
  depositar(valor: number): Goal {
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error("Goal.depositar: valor deve ser positivo.");
    }
    if (this.concluida) {
      throw new Error("Goal.depositar: a meta já foi atingida.");
    }
    const novoValor = Math.min(this.currentAmount + valor, this.targetAmount);
    return Goal.reconstituir({
      ...this.toProps(),
      currentAmount: novoValor,
      syncStatus: transicionarSyncStatus(this.syncStatus, "pending"),
      updatedAt: Date.now(),
    });
  }

  /** Percentual de conclusão (0 a 100). Usa floor: 100% só quando a meta é realmente atingida. */
  get percentualConcluido(): number {
    if (this.targetAmount === 0) return 0;
    return Math.floor((this.currentAmount / this.targetAmount) * 100);
  }

  /** Indica se a meta foi atingida. */
  get concluida(): boolean {
    return this.currentAmount >= this.targetAmount;
  }

  /** Nova edição local: volta para 'pending' e atualiza updatedAt. */
  marcarPendente(): Goal {
    return Goal.reconstituir({
      ...this.toProps(),
      syncStatus: transicionarSyncStatus(this.syncStatus, "pending"),
      updatedAt: Date.now(),
    });
  }

  /** Retry: 'error' → 'pending' sem alterar updatedAt. */
  reenfileirar(): Goal {
    return Goal.reconstituir({
      ...this.toProps(),
      syncStatus: transicionarSyncStatus(this.syncStatus, "pending"),
    });
  }

  /** Confirmação do servidor: 'pending' → 'synced'. */
  marcarSincronizado(): Goal {
    return Goal.reconstituir({
      ...this.toProps(),
      syncStatus: transicionarSyncStatus(this.syncStatus, "synced"),
    });
  }

  /** Falha de sync: 'pending' → 'error'. */
  marcarErroSync(): Goal {
    return Goal.reconstituir({
      ...this.toProps(),
      syncStatus: transicionarSyncStatus(this.syncStatus, "error"),
    });
  }

  toProps(): GoalProps {
    return {
      id: this.id,
      title: this.title,
      targetAmount: this.targetAmount,
      currentAmount: this.currentAmount,
      colorHex: this.colorHex,
      syncStatus: this.syncStatus,
      updatedAt: this.updatedAt,
    };
  }
}
