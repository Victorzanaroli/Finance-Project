/**
 * src/__tests__/domain/Transaction.test.ts
 *
 * Testes de domínio — Nível 1 da pirâmide TDD (SKILL.md seção 10).
 *
 * Características:
 *  - Zero mocks — Transaction é objeto puro.
 *  - Testam invariantes, factory methods e transições de estado.
 *  - Executam em milissegundos (sem I/O).
 *
 * Rastreabilidade: RF "RegistrarTransacao" → Transaction.criar()
 */

import { Transaction } from "../../domain/entities/Transaction";

describe("Transaction — Entidade de Domínio", () => {
  // ── Factory Transaction.criar() ──────────────────────────────────────────

  describe("Transaction.criar()", () => {
    it("deve criar uma Transaction válida com syncStatus = 'pending'", () => {
      const transaction = Transaction.criar({
        id: "uuid-test-1",
        title: "Salário",
        amount: 5000,
        type: "income",
        category: "Trabalho",
        isFixed: true,
        date: "2024-01-01",
      });

      expect(transaction.id).toBe("uuid-test-1");
      expect(transaction.title).toBe("Salário");
      expect(transaction.amount).toBe(5000);
      expect(transaction.type).toBe("income");
      expect(transaction.syncStatus).toBe("pending");
      expect(transaction.updatedAt).toBeGreaterThan(0);
    });

    it("deve lançar erro se title for vazio", () => {
      expect(() =>
        Transaction.criar({
          id: "uuid-1",
          title: "   ", // só espaços
          amount: 100,
          type: "expense",
          category: "Teste",
          isFixed: false,
          date: "2024-01-01",
        })
      ).toThrow("title não pode ser vazio");
    });

    it("deve lançar erro se amount for zero ou negativo", () => {
      expect(() =>
        Transaction.criar({
          id: "uuid-1",
          title: "Teste",
          amount: 0,
          type: "expense",
          category: "Teste",
          isFixed: false,
          date: "2024-01-01",
        })
      ).toThrow("amount deve ser maior que zero");

      expect(() =>
        Transaction.criar({
          id: "uuid-1",
          title: "Teste",
          amount: -50,
          type: "expense",
          category: "Teste",
          isFixed: false,
          date: "2024-01-01",
        })
      ).toThrow("amount deve ser maior que zero");
    });

    it("deve lançar erro se date não estiver no formato YYYY-MM-DD", () => {
      expect(() =>
        Transaction.criar({
          id: "uuid-1",
          title: "Teste",
          amount: 100,
          type: "expense",
          category: "Teste",
          isFixed: false,
          date: "01/01/2024", // formato inválido
        })
      ).toThrow("date deve estar no formato ISO YYYY-MM-DD");
    });

    it("deve lançar erro se date for uma data inexistente no calendário", () => {
      expect(() =>
        Transaction.criar({
          id: "uuid-1",
          title: "Teste",
          amount: 100,
          type: "expense",
          category: "Teste",
          isFixed: false,
          date: "2025-02-30",
        })
      ).toThrow("date deve estar no formato ISO YYYY-MM-DD");
    });

    it("deve lançar erro se category for vazia", () => {
      expect(() =>
        Transaction.criar({
          id: "uuid-1",
          title: "Teste",
          amount: 100,
          type: "expense",
          category: "  ",
          isFixed: false,
          date: "2024-01-01",
        })
      ).toThrow("category não pode ser vazia");
    });

    it("deve lançar erro se type não for income nem expense", () => {
      expect(() =>
        Transaction.criar({
          id: "uuid-1",
          title: "Teste",
          amount: 100,
          type: "transfer" as never,
          category: "Teste",
          isFixed: false,
          date: "2024-01-01",
        })
      ).toThrow("type deve ser 'income' ou 'expense'");
    });

    it.each([NaN, Infinity])("deve lançar erro se amount não for um número finito (%s)", (amount) => {
      expect(() =>
        Transaction.criar({
          id: "uuid-1",
          title: "Teste",
          amount,
          type: "expense",
          category: "Teste",
          isFixed: false,
          date: "2024-01-01",
        })
      ).toThrow("amount deve ser maior que zero");
    });
  });

  // ── Transições de estado (máquina de estados de sync) ────────────────────

  describe("Máquina de estados de sincronização", () => {
    const base = Transaction.criar({
      id: "uuid-1",
      title: "Aluguel",
      amount: 1500,
      type: "expense",
      category: "Moradia",
      isFixed: true,
      date: "2024-01-01",
    });

    it("nova Transaction sempre começa com syncStatus = 'pending'", () => {
      expect(base.syncStatus).toBe("pending");
    });

    it("marcarSincronizado() retorna nova instância com syncStatus = 'synced'", () => {
      const synced = base.marcarSincronizado();
      expect(synced.syncStatus).toBe("synced");
      // Imutabilidade — o original não é alterado
      expect(base.syncStatus).toBe("pending");
    });

    it("marcarErroSync() retorna syncStatus = 'error'", () => {
      const error = base.marcarErroSync();
      expect(error.syncStatus).toBe("error");
    });

    it("marcarPendente() atualiza updatedAt e retorna syncStatus = 'pending'", () => {
      const synced = base.marcarSincronizado();
      const pending = synced.marcarPendente();
      expect(pending.syncStatus).toBe("pending");
      expect(pending.updatedAt).toBeGreaterThanOrEqual(synced.updatedAt);
    });

    it("reenfileirar() leva 'error' de volta a 'pending' SEM alterar updatedAt (last-write-wins)", () => {
      const comErro = Transaction.reconstituir({ ...base.toProps(), syncStatus: "error", updatedAt: 1000 });
      const retry = comErro.reenfileirar();
      expect(retry.syncStatus).toBe("pending");
      expect(retry.updatedAt).toBe(1000);
    });

    it("rejeita transições inválidas (synced → error, error → synced)", () => {
      const synced = base.marcarSincronizado();
      expect(() => synced.marcarErroSync()).toThrow("Transição de sincronização inválida");
      expect(() => synced.marcarSincronizado()).toThrow("Transição de sincronização inválida");

      const comErro = base.marcarErroSync();
      expect(() => comErro.marcarSincronizado()).toThrow("Transição de sincronização inválida");
    });
  });

  // ── Imutabilidade ────────────────────────────────────────────────────────

  describe("Imutabilidade", () => {
    it("toProps() deve retornar objeto com todos os campos", () => {
      const t = Transaction.criar({
        id: "uuid-1",
        title: "Teste",
        amount: 200,
        type: "income",
        category: "Freelance",
        isFixed: false,
        date: "2024-06-15",
      });

      const props = t.toProps();
      expect(props).toMatchObject({
        id: "uuid-1",
        title: "Teste",
        amount: 200,
        type: "income",
        syncStatus: "pending",
      });
    });
  });
});
