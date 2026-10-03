/**
 * src/__tests__/application/RegistrarTransacaoUseCase.test.ts
 *
 * Testes do Caso de Uso — Nível 2 da pirâmide TDD (SKILL.md seção 10).
 * Usa FAKES in-memory (não mocks de framework).
 *
 * Rastreabilidade: RF "RegistrarTransacao" → RegistrarTransacaoUseCase.executar()
 */

import { RegistrarTransacaoUseCase } from "../../application/use-cases/RegistrarTransacaoUseCase";
import { FakeUuidGenerator, InMemoryTransactionRepository } from "../helpers/fakes";

describe("RegistrarTransacaoUseCase", () => {
  let repository: InMemoryTransactionRepository;
  let useCase: RegistrarTransacaoUseCase;

  beforeEach(() => {
    repository = new InMemoryTransactionRepository();
    useCase = new RegistrarTransacaoUseCase(repository, new FakeUuidGenerator("fake-uuid"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("salva a transação no repositório com syncStatus = 'pending'", async () => {
    const result = await useCase.executar({
      title: "Salário",
      amount: 5000,
      type: "income",
      category: "Trabalho",
      isFixed: true,
    });

    expect(result.id).toBe("fake-uuid-1");
    expect(result.syncStatus).toBe("pending");
    expect(result.title).toBe("Salário");
    expect(repository.store).toHaveLength(1);
    expect(repository.store[0].id).toBe("fake-uuid-1");
  });

  it("gera um UUID único por chamada", async () => {
    const base = { amount: 100, type: "expense", category: "Teste", isFixed: false } as const;
    await useCase.executar({ ...base, title: "Transação 1" });
    await useCase.executar({ ...base, title: "Transação 2" });

    expect(repository.store.map((t) => t.id)).toEqual(["fake-uuid-1", "fake-uuid-2"]);
  });

  it("remove espaços extras do título", async () => {
    const result = await useCase.executar({
      title: "  Mercado  ",
      amount: 10,
      type: "expense",
      category: "Alimentação",
      isFixed: false,
    });
    expect(result.title).toBe("Mercado");
  });

  it("usa a data de hoje quando date não é fornecida", async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 10, 12, 0, 0));
    const result = await useCase.executar({
      title: "Teste",
      amount: 50,
      type: "expense",
      category: "Outros",
      isFixed: false,
    });
    expect(result.date).toBe("2026-03-10");
  });

  it("REGRESSÃO de fuso: às 23h30 locais continua no MESMO dia (não pula para o dia seguinte em UTC)", async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 11, 31, 23, 30, 0));
    const result = await useCase.executar({
      title: "Jantar",
      amount: 80,
      type: "expense",
      category: "Alimentação",
      isFixed: false,
    });
    expect(result.date).toBe("2026-12-31");
  });

  it("respeita a data informada", async () => {
    const result = await useCase.executar({
      title: "Aluguel",
      amount: 900,
      type: "expense",
      category: "Casa",
      isFixed: true,
      date: "2025-01-05",
    });
    expect(result.date).toBe("2025-01-05");
  });

  it("propaga erro de invariante da entidade e NÃO persiste", async () => {
    await expect(
      useCase.executar({ title: "", amount: 100, type: "expense", category: "Teste", isFixed: false })
    ).rejects.toThrow("title não pode ser vazio");
    expect(repository.store).toHaveLength(0);
  });

  it("rejeita amount negativo sem persistir", async () => {
    await expect(
      useCase.executar({ title: "Inválido", amount: -100, type: "expense", category: "Teste", isFixed: false })
    ).rejects.toThrow("amount deve ser maior que zero");
    expect(repository.store).toHaveLength(0);
  });
});
