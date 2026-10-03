/**
 * src/__tests__/application/ObterResumoFinanceiroUseCase.test.ts
 *
 * Rastreabilidade: RF "Consultar Dashboard" → ObterResumoFinanceiroUseCase.
 */

import { ObterResumoFinanceiroUseCase } from "../../application/use-cases/ObterResumoFinanceiroUseCase";
import { Goal } from "../../domain/entities/Goal";
import { Transaction, type TransactionProps } from "../../domain/entities/Transaction";
import { InMemoryGoalRepository, InMemoryTransactionRepository } from "../helpers/fakes";

const tx = (over: Partial<TransactionProps> & Pick<TransactionProps, "id">) =>
  Transaction.criar({
    title: "T",
    amount: 100,
    type: "expense",
    category: "Casa",
    isFixed: false,
    date: "2025-03-10",
    ...over,
  });

describe("ObterResumoFinanceiroUseCase", () => {
  let txRepo: InMemoryTransactionRepository;
  let goalRepo: InMemoryGoalRepository;
  let useCase: ObterResumoFinanceiroUseCase;

  beforeEach(() => {
    txRepo = new InMemoryTransactionRepository();
    goalRepo = new InMemoryGoalRepository();
    useCase = new ObterResumoFinanceiroUseCase(txRepo, goalRepo);
  });

  afterEach(() => jest.useRealTimers());

  it("calcula receitas, despesas fixas/variáveis e saldo livre do mês", async () => {
    await txRepo.salvar(tx({ id: "1", type: "income", amount: 3000, category: "Salário" }));
    await txRepo.salvar(tx({ id: "2", amount: 800, isFixed: true, category: "Casa" }));
    await txRepo.salvar(tx({ id: "3", amount: 200, isFixed: false, category: "Lazer" }));
    // outro mês — deve ser ignorado
    await txRepo.salvar(tx({ id: "4", amount: 999, date: "2025-04-01" }));

    const r = await useCase.executar("2025-03");

    expect(r.mesReferencia).toBe("2025-03");
    expect(r.totalReceitas).toBe(3000);
    expect(r.totalDespesasFixas).toBe(800);
    expect(r.totalDespesasVariaveis).toBe(200);
    expect(r.totalDespesas).toBe(1000);
    expect(r.saldoLivre).toBe(2000);
  });

  it("agrupa despesas por categoria, ordenadas do maior para o menor, com percentual", async () => {
    await txRepo.salvar(tx({ id: "1", amount: 500, category: "Casa" }));
    await txRepo.salvar(tx({ id: "2", amount: 250, category: "Casa" }));
    await txRepo.salvar(tx({ id: "3", amount: 250, category: "Lazer" }));
    await txRepo.salvar(tx({ id: "4", type: "income", amount: 9999, category: "Salário" }));

    const r = await useCase.executar("2025-03");

    expect(r.despesasPorCategoria).toEqual([
      { categoria: "Casa", total: 750, percentual: 75 },
      { categoria: "Lazer", total: 250, percentual: 25 },
    ]);
  });

  it("sem despesas: lista de categorias vazia (sem dados fictícios) e saldo = receitas", async () => {
    await txRepo.salvar(tx({ id: "1", type: "income", amount: 100, category: "Salário" }));
    const r = await useCase.executar("2025-03");
    expect(r.despesasPorCategoria).toEqual([]);
    expect(r.saldoLivre).toBe(100);
  });

  it("evita erros de ponto flutuante nos totais (0,1 + 0,2)", async () => {
    await txRepo.salvar(tx({ id: "1", amount: 0.1 }));
    await txRepo.salvar(tx({ id: "2", amount: 0.2 }));
    const r = await useCase.executar("2025-03");
    expect(r.totalDespesas).toBe(0.3);
  });

  it("retorna as caixinhas e conta registros não sincronizados (pending + error)", async () => {
    await goalRepo.salvar(Goal.criar({ id: "g1", title: "Meta", targetAmount: 100, colorHex: "#7c3aed" }));
    await txRepo.salvar(tx({ id: "1" }));
    await txRepo.salvar(tx({ id: "2" }).marcarSincronizado());
    await txRepo.salvar(tx({ id: "3" }).marcarErroSync());

    const r = await useCase.executar("2025-03");

    expect(r.caixinhas).toHaveLength(1);
    // tx 1 (pending) + tx 3 (error) + goal g1 (pending)
    expect(r.pendentesSincronizacao).toBe(3);
  });

  it("usa o mês LOCAL atual por padrão (REGRESSÃO de fuso)", async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 31, 23, 45, 0));
    const r = await useCase.executar();
    expect(r.mesReferencia).toBe("2026-01");
  });

  it("rejeita mês de referência em formato inválido", async () => {
    await expect(useCase.executar("2025-13")).rejects.toThrow("mesReferencia deve estar no formato YYYY-MM");
    await expect(useCase.executar("março")).rejects.toThrow("mesReferencia deve estar no formato YYYY-MM");
  });
});
