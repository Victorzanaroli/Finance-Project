/**
 * src/__tests__/domain/Goal.test.ts
 *
 * Testes de domínio da entidade Goal (Caixinha). Zero mocks.
 */

import { Goal } from "../../domain/entities/Goal";

const base = () =>
  Goal.criar({
    id: "g-1",
    title: "Viagem",
    targetAmount: 1000,
    colorHex: "#7c3aed",
  });

describe("Goal — Entidade de Domínio", () => {
  describe("Goal.criar()", () => {
    it("cria caixinha válida com currentAmount 0 e syncStatus 'pending'", () => {
      const goal = base();
      expect(goal.currentAmount).toBe(0);
      expect(goal.syncStatus).toBe("pending");
      expect(goal.updatedAt).toBeGreaterThan(0);
    });

    it("aceita currentAmount inicial", () => {
      const goal = Goal.criar({ id: "g", title: "X", targetAmount: 100, currentAmount: 40, colorHex: "#fff000" });
      expect(goal.currentAmount).toBe(40);
    });

    it("rejeita title vazio", () => {
      expect(() => Goal.criar({ id: "g", title: " ", targetAmount: 10, colorHex: "#7c3aed" })).toThrow(
        "title não pode ser vazio"
      );
    });

    it.each([0, -5, NaN])("rejeita targetAmount inválido (%s)", (targetAmount) => {
      expect(() => Goal.criar({ id: "g", title: "X", targetAmount, colorHex: "#7c3aed" })).toThrow(
        "targetAmount deve ser maior que zero"
      );
    });

    it("rejeita currentAmount negativo", () => {
      expect(() =>
        Goal.criar({ id: "g", title: "X", targetAmount: 10, currentAmount: -1, colorHex: "#7c3aed" })
      ).toThrow("currentAmount não pode ser negativo");
    });

    it("rejeita currentAmount maior que targetAmount", () => {
      expect(() =>
        Goal.criar({ id: "g", title: "X", targetAmount: 10, currentAmount: 11, colorHex: "#7c3aed" })
      ).toThrow("currentAmount não pode exceder targetAmount");
    });

    it.each(["roxo", "#fff", "7c3aed", "#7c3aeg"])("rejeita colorHex inválido (%s)", (colorHex) => {
      expect(() => Goal.criar({ id: "g", title: "X", targetAmount: 10, colorHex })).toThrow(
        "colorHex deve ser uma cor hexadecimal"
      );
    });
  });

  describe("depositar()", () => {
    it("soma o valor, volta para 'pending' e não altera a instância original", () => {
      const goal = base().marcarSincronizado();
      const depois = goal.depositar(250);
      expect(depois.currentAmount).toBe(250);
      expect(depois.syncStatus).toBe("pending");
      expect(goal.currentAmount).toBe(0);
      expect(goal.syncStatus).toBe("synced");
    });

    it("limita o acumulado ao valor da meta", () => {
      const goal = Goal.criar({ id: "g", title: "X", targetAmount: 100, currentAmount: 90, colorHex: "#7c3aed" });
      expect(goal.depositar(50).currentAmount).toBe(100);
    });

    it("rejeita valor zero ou negativo", () => {
      expect(() => base().depositar(0)).toThrow("valor deve ser positivo");
      expect(() => base().depositar(-1)).toThrow("valor deve ser positivo");
    });

    it("rejeita depósito em meta já atingida", () => {
      const cheia = Goal.criar({ id: "g", title: "X", targetAmount: 100, currentAmount: 100, colorHex: "#7c3aed" });
      expect(() => cheia.depositar(10)).toThrow("meta já foi atingida");
    });
  });

  describe("progresso", () => {
    it("percentualConcluido nunca arredonda para 100 antes de concluir (usa floor)", () => {
      const quase = Goal.criar({ id: "g", title: "X", targetAmount: 1000, currentAmount: 999, colorHex: "#7c3aed" });
      expect(quase.percentualConcluido).toBe(99);
      expect(quase.concluida).toBe(false);
    });

    it("concluida = true e 100% quando atinge a meta", () => {
      const cheia = Goal.criar({ id: "g", title: "X", targetAmount: 100, currentAmount: 100, colorHex: "#7c3aed" });
      expect(cheia.percentualConcluido).toBe(100);
      expect(cheia.concluida).toBe(true);
    });

    it("percentualConcluido = 0 quando targetAmount for 0 (dados legados reconstituídos)", () => {
      const legado = Goal.reconstituir({ ...base().toProps(), targetAmount: 0 });
      expect(legado.percentualConcluido).toBe(0);
    });
  });

  describe("máquina de estados de sincronização", () => {
    it("marcarSincronizado() só a partir de 'pending'", () => {
      const synced = base().marcarSincronizado();
      expect(synced.syncStatus).toBe("synced");
      expect(() => synced.marcarSincronizado()).toThrow("Transição de sincronização inválida");
    });

    it("marcarErroSync() e reenfileirar() preservam updatedAt", () => {
      const goal = Goal.reconstituir({ ...base().toProps(), updatedAt: 500 });
      const erro = goal.marcarErroSync();
      expect(erro.syncStatus).toBe("error");
      const retry = erro.reenfileirar();
      expect(retry.syncStatus).toBe("pending");
      expect(retry.updatedAt).toBe(500);
    });

    it("marcarPendente() registra nova edição local com updatedAt atualizado", () => {
      const synced = Goal.reconstituir({ ...base().toProps(), syncStatus: "synced", updatedAt: 1 });
      const pendente = synced.marcarPendente();
      expect(pendente.syncStatus).toBe("pending");
      expect(pendente.updatedAt).toBeGreaterThan(1);
    });

    it("rejeita synced → error", () => {
      expect(() => base().marcarSincronizado().marcarErroSync()).toThrow("Transição de sincronização inválida");
    });
  });
});
