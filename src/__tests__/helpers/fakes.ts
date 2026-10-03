/**
 * src/__tests__/helpers/fakes.ts
 *
 * Fakes in-memory das portas do domínio (SKILL.md seção 10 — TDD nível 2).
 * Implementam as MESMAS interfaces dos adapters reais — não são mocks de
 * framework — e substituem as 3 cópias duplicadas que existiam nos testes.
 */

import type { Goal } from "../../domain/entities/Goal";
import type { SyncStatus, Transaction } from "../../domain/entities/Transaction";
import type { IFaturaOcrGateway, DadosFatura } from "../../domain/gateways/IFaturaOcrGateway";
import type { INetworkGateway } from "../../domain/gateways/INetworkGateway";
import type { ISyncGateway, SyncResult } from "../../domain/gateways/ISyncGateway";
import type { IUuidGenerator } from "../../domain/gateways/IUuidGenerator";
import type { IGoalRepository } from "../../domain/repositories/IGoalRepository";
import type {
  ITransactionRepository,
  TransactionFilters,
} from "../../domain/repositories/ITransactionRepository";

export class InMemoryTransactionRepository implements ITransactionRepository {
  public store: Transaction[] = [];

  async salvar(transaction: Transaction): Promise<void> {
    this.store.push(transaction);
  }

  async atualizar(transaction: Transaction): Promise<void> {
    const idx = this.store.findIndex((t) => t.id === transaction.id);
    if (idx >= 0) this.store[idx] = transaction;
  }

  async buscarTodas(filters?: TransactionFilters): Promise<Transaction[]> {
    return this.store.filter((t) => {
      if (filters?.type && t.type !== filters.type) return false;
      if (filters?.isFixed !== undefined && t.isFixed !== filters.isFixed) return false;
      if (filters?.syncStatus && t.syncStatus !== filters.syncStatus) return false;
      if (filters?.month && !t.date.startsWith(filters.month)) return false;
      return true;
    });
  }

  async buscarPorSyncStatus(status: SyncStatus): Promise<Transaction[]> {
    return this.store.filter((t) => t.syncStatus === status);
  }

  async buscarPorId(id: string): Promise<Transaction | undefined> {
    return this.store.find((t) => t.id === id);
  }

  async deletar(id: string): Promise<void> {
    this.store = this.store.filter((t) => t.id !== id);
  }

  async deletarTodas(): Promise<void> {
    this.store = [];
  }
}

export class InMemoryGoalRepository implements IGoalRepository {
  public store: Goal[] = [];
  /** Permite simular falha de persistência em testes de compensação. */
  public falharEmAtualizar = false;

  async salvar(goal: Goal): Promise<void> {
    this.store.push(goal);
  }

  async atualizar(goal: Goal): Promise<void> {
    if (this.falharEmAtualizar) throw new Error("falha simulada ao atualizar caixinha");
    const idx = this.store.findIndex((g) => g.id === goal.id);
    if (idx >= 0) this.store[idx] = goal;
  }

  async buscarTodas(): Promise<Goal[]> {
    return [...this.store];
  }

  async buscarPorSyncStatus(status: SyncStatus): Promise<Goal[]> {
    return this.store.filter((g) => g.syncStatus === status);
  }

  async buscarPorId(id: string): Promise<Goal | undefined> {
    return this.store.find((g) => g.id === id);
  }

  async deletar(id: string): Promise<void> {
    this.store = this.store.filter((g) => g.id !== id);
  }

  async deletarTodas(): Promise<void> {
    this.store = [];
  }
}

export class FakeUuidGenerator implements IUuidGenerator {
  private counter = 0;
  constructor(private readonly prefixo = "uuid") {}
  gerar(): string {
    return `${this.prefixo}-${++this.counter}`;
  }
}

export class FakeNetworkGateway implements INetworkGateway {
  constructor(public conectado = true) {}
  async estaConectado(): Promise<boolean> {
    return this.conectado;
  }
}

export class FakeSyncGateway implements ISyncGateway {
  public transacoesEnviadas: Transaction[] = [];
  public goalsEnviadas: Goal[] = [];
  /** IDs que devem falhar (retornando success:false). */
  public falhasPorId = new Map<string, string>();
  /** IDs que devem lançar exceção (gateway mal comportado). */
  public excecoesPorId = new Set<string>();

  private resultado(id: string): SyncResult {
    if (this.excecoesPorId.has(id)) throw new Error(`exceção simulada ${id}`);
    if (this.falhasPorId.has(id)) return { success: false, error: this.falhasPorId.get(id) };
    return { success: true };
  }

  async sincronizarTransaction(transaction: Transaction): Promise<SyncResult> {
    this.transacoesEnviadas.push(transaction);
    return this.resultado(transaction.id);
  }

  async sincronizarGoal(goal: Goal): Promise<SyncResult> {
    this.goalsEnviadas.push(goal);
    return this.resultado(goal.id);
  }

  async deletarTransactionRemota(_id: string): Promise<SyncResult> {
    return { success: true };
  }
}

export class FakeFaturaOcrGateway implements IFaturaOcrGateway {
  public chamadas: string[] = [];
  constructor(private readonly resposta: DadosFatura = { titulo: "Conta de Luz", valor: "148,90", categoria: "Casa" }) {}
  async reconhecer(fotoUri: string): Promise<DadosFatura> {
    this.chamadas.push(fotoUri);
    return this.resposta;
  }
}
