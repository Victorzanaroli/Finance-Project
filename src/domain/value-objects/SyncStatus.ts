/**
 * src/domain/value-objects/SyncStatus.ts
 *
 * Camada: Domínio — Value Object de estado de sincronização.
 *
 * Máquina de estados (SKILL.md seção 5):
 *   pending → synced   (servidor confirmou)
 *   pending → error    (falha de rede/validação)
 *   pending → pending  (nova edição local antes de sincronizar)
 *   synced  → pending  (nova edição local)
 *   error   → pending  (retry)
 *
 * Qualquer outra transição é inválida (ex.: synced → error, error → synced).
 */

export type SyncStatus = "pending" | "synced" | "error";

const TRANSICOES_VALIDAS: Readonly<Record<SyncStatus, readonly SyncStatus[]>> = {
  pending: ["pending", "synced", "error"],
  synced: ["pending"],
  error: ["pending"],
};

/** Type guard — útil para validar dados vindos de fora do domínio. */
export function isSyncStatus(valor: unknown): valor is SyncStatus {
  return valor === "pending" || valor === "synced" || valor === "error";
}

export function podeTransicionar(origem: SyncStatus, destino: SyncStatus): boolean {
  return TRANSICOES_VALIDAS[origem].includes(destino);
}

/**
 * Valida a transição e devolve o novo estado.
 * @throws Error se a transição não existir na máquina de estados.
 */
export function transicionarSyncStatus(origem: SyncStatus, destino: SyncStatus): SyncStatus {
  if (!podeTransicionar(origem, destino)) {
    throw new Error(`Transição de sincronização inválida: ${origem} → ${destino}.`);
  }
  return destino;
}
