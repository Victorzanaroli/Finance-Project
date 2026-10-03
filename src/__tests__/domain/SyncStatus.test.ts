/**
 * Testes do Value Object SyncStatus — máquina de estados de sincronização
 * (SKILL.md seção 5).
 */

import {
  isSyncStatus,
  podeTransicionar,
  transicionarSyncStatus,
} from "../../domain/value-objects/SyncStatus";

describe("SyncStatus — máquina de estados", () => {
  it.each([
    ["pending", "synced"],
    ["pending", "error"],
    ["pending", "pending"],
    ["synced", "pending"],
    ["error", "pending"],
  ] as const)("permite %s → %s", (origem, destino) => {
    expect(podeTransicionar(origem, destino)).toBe(true);
    expect(transicionarSyncStatus(origem, destino)).toBe(destino);
  });

  it.each([
    ["synced", "error"],
    ["synced", "synced"],
    ["error", "synced"],
    ["error", "error"],
  ] as const)("rejeita %s → %s", (origem, destino) => {
    expect(podeTransicionar(origem, destino)).toBe(false);
    expect(() => transicionarSyncStatus(origem, destino)).toThrow(
      `Transição de sincronização inválida: ${origem} → ${destino}.`
    );
  });

  it("isSyncStatus reconhece apenas valores válidos", () => {
    expect(isSyncStatus("pending")).toBe(true);
    expect(isSyncStatus("synced")).toBe(true);
    expect(isSyncStatus("error")).toBe(true);
    expect(isSyncStatus("foo")).toBe(false);
    expect(isSyncStatus(undefined)).toBe(false);
  });
});
