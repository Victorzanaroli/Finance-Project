/**
 * src/__tests__/application/TransacoesUseCases.test.ts
 *
 * Testes de LimparDadosUseCase e operações de filtro/exclusão em ITransactionRepository.
 */

import { LimparDadosUseCase } from "../../application/use-cases/LimparDadosUseCase";
import { Transaction } from "../../domain/entities/Transaction";
import { FakeUuidGenerator, InMemoryGoalRepository, InMemoryTransactionRepository } from "../helpers/fakes";

describe("LimparDadosUseCase & Repositório de Transações", () => {
  it("apaga todas as transações e recria as caixinhas padrão", async () => {
    const txRepo = new InMemoryTransactionRepository();
    const goalRepo = new InMemoryGoalRepository();
    const uuid = new FakeUuidGenerator("seed");

    await txRepo.salvar(
      Transaction.criar({
        id: "tx-1",
        title: "Mercado",
        amount: 250,
        type: "expense",
        category: "Alimentação",
        isFixed: false,
        date: "2026-10-12",
      })
    );

    const useCase = new LimparDadosUseCase(txRepo, goalRepo, uuid);
    await useCase.executar();

    expect(await txRepo.buscarTodas()).toHaveLength(0);
    expect(await goalRepo.buscarTodas()).toHaveLength(2);
  });
});
