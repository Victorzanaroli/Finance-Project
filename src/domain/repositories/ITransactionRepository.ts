/**
 * src/domain/repositories/ITransactionRepository.ts
 *
 * Camada: Domínio — Interface (Port) do repositório de Transactions.
 *
 * REGRA ABSOLUTA: Interface pura — nenhum import de Drizzle, expo-sqlite
 * ou qualquer biblioteca de infraestrutura. O domínio define o contrato;
 * a implementação fica em src/adapters/repositories/.
 *
 * Padrão DDD (SKILL.md seção 10):
 *  "Repository: interface no domínio, implementação SQLite/Drizzle na infra.
 *   Um repository por aggregate root."
 *
 * Rastreabilidade: RegistrarTransacaoUseCase, SincronizarFilaUseCase.
 */

import type { Transaction } from "../entities/Transaction";
import type { SyncStatus } from "../entities/Transaction";

/**
 * Filtros opcionais para consultas de transações.
 */
export interface TransactionFilters {
  /** Filtrar por tipo (receita ou despesa). */
  type?: "income" | "expense";
  /** Filtrar por mês/ano no formato "YYYY-MM". */
  month?: string;
  /** Filtrar apenas transações fixas. */
  isFixed?: boolean;
  /** Filtrar por estado de sincronização. */
  syncStatus?: SyncStatus;
}

/**
 * Contrato do repositório de Transactions.
 *
 * Todas as operações são assíncronas porque a implementação real
 * acessa SQLite (I/O). Fakes de teste também implementam esta interface
 * com arrays em memória.
 */
export interface ITransactionRepository {
  /**
   * Persiste uma nova Transaction.
   * Chamado pelo RegistrarTransacaoUseCase após criar a entidade.
   */
  salvar(transaction: Transaction): Promise<void>;

  /**
   * Atualiza uma Transaction existente (ex: após sync bem-sucedido).
   * Chamado pelo SincronizarFilaUseCase para marcar como 'synced'.
   */
  atualizar(transaction: Transaction): Promise<void>;

  /**
   * Busca todas as transações, com filtros opcionais.
   * Usado pelo Dashboard para calcular totais por período.
   */
  buscarTodas(filters?: TransactionFilters): Promise<Transaction[]>;

  /**
   * Busca transações com sync_status específico.
   * Usado pelo SincronizarFilaUseCase para processar a fila pendente.
   */
  buscarPorSyncStatus(status: SyncStatus): Promise<Transaction[]>;

  /**
   * Busca uma Transaction por ID.
   * Retorna undefined se não encontrada.
   */
  buscarPorId(id: string): Promise<Transaction | undefined>;

  /**
   * Remove uma Transaction por ID.
   */
  deletar(id: string): Promise<void>;

  /**
   * Remove todas as transações do banco de dados local.
   */
  deletarTodas(): Promise<void>;
}
