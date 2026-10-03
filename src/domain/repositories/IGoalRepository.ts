/**
 * src/domain/repositories/IGoalRepository.ts
 *
 * Camada: Domínio — Interface (Port) do repositório de Goals (Caixinhas).
 *
 * REGRA ABSOLUTA: Nenhum import de infraestrutura.
 */

import type { Goal } from "../entities/Goal";
import type { SyncStatus } from "../entities/Transaction";

export interface IGoalRepository {
  /** Persiste uma nova caixinha. */
  salvar(goal: Goal): Promise<void>;

  /** Atualiza uma caixinha existente. */
  atualizar(goal: Goal): Promise<void>;

  /** Retorna todas as caixinhas. */
  buscarTodas(): Promise<Goal[]>;

  /** Busca por sync_status — usado pelo engine de sincronização. */
  buscarPorSyncStatus(status: SyncStatus): Promise<Goal[]>;

  /** Busca por ID. */
  buscarPorId(id: string): Promise<Goal | undefined>;

  /** Remove uma caixinha. */
  deletar(id: string): Promise<void>;

  /** Remove todas as caixinhas. */
  deletarTodas(): Promise<void>;
}
