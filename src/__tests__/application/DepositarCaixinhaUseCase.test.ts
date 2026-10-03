/**
 * src/__tests__/application/DepositarCaixinhaUseCase.test.ts
 *
 * Testes do Caso de Uso DepositarCaixinhaUseCase.
 */

import { DepositarCaixinhaUseCase } from "../../application/use-cases/DepositarCaixinhaUseCase";
import { RegistrarTransacaoUseCase } from "../../application/use-cases/RegistrarTransacaoUseCase";
import { Goal } from "../../domain/entities/Goal";
import { FakeUuidGenerator, InMemoryGoalRepository, InMemoryTransactionRepository } from "../helpers/fakes";

describe("DepositarCaixinhaUseCase", () => {
  let goalRepo: InMemoryGoalRepository;
  let txRepo: InMemoryTransactionRepository;
  let useCase: DepositarCaixinhaUseCase;

  const criarGoal = (currentAmount = 200, targetAmount = 1000) =>
    Goal.criar({ id: "goal-1", title: "Viagem", targetAmount, currentAmount, colorHex: "#7c3aed" });

  beforeEach(() => {
    goalRepo = new InMemoryGoalRepository();
    txRepo = new InMemoryTransactionRepository();
    const registrar = new RegistrarTransacaoUseCase(txRepo, new FakeUuidGenerator());
    useCase = new DepositarCaixinhaUseCase(goalRepo, registrar, txRepo);
  });

  it("deposita o valor na caixinha e cria a transação espelhada de Poupança", async () => {
    await goalRepo.salvar(criarGoal());

    const result = await useCase.executar({ goalId: "goal-1", amount: 150, category: "Poupança" });

    expect(result.goal.currentAmount).toBe(350);
    expect((await goalRepo.buscarPorId("goal-1"))?.currentAmount).toBe(350);

    expect(result.transaction.title).toBe("Depósito na Caixinha: Viagem");
    expect(result.transaction.amount).toBe(150);
    expect(result.transaction.type).toBe("expense");
    expect(result.transaction.category).toBe("Poupança");
    expect(txRepo.store).toHaveLength(1);
  });

  it("usa 'Poupança' como categoria padrão", async () => {
    await goalRepo.salvar(criarGoal());
    const result = await useCase.executar({ goalId: "goal-1", amount: 10 });
    expect(result.transaction.category).toBe("Poupança");
  });

  it("REGRESSÃO: quando o depósito excede a meta, a transação registra apenas o valor EFETIVAMENTE guardado", async () => {
    await goalRepo.salvar(criarGoal(90, 100));

    const result = await useCase.executar({ goalId: "goal-1", amount: 50 });

    expect(result.goal.currentAmount).toBe(100);
    expect(result.transaction.amount).toBe(10); // antes registrava R$50 (dinheiro "sumia" do Caixa Livre)
  });

  it("rejeita depósito em meta já atingida, sem criar transação", async () => {
    await goalRepo.salvar(criarGoal(1000, 1000));

    await expect(useCase.executar({ goalId: "goal-1", amount: 10 })).rejects.toThrow("meta já foi atingida");
    expect(txRepo.store).toHaveLength(0);
  });

  it("COMPENSAÇÃO: se persistir a caixinha falhar, a transação criada é desfeita", async () => {
    await goalRepo.salvar(criarGoal());
    goalRepo.falharEmAtualizar = true;

    await expect(useCase.executar({ goalId: "goal-1", amount: 100 })).rejects.toThrow("falha simulada");

    expect(txRepo.store).toHaveLength(0);
    expect((await goalRepo.buscarPorId("goal-1"))?.currentAmount).toBe(200);
  });

  it("falha se a caixinha não for encontrada", async () => {
    await expect(useCase.executar({ goalId: "inexistente", amount: 100 })).rejects.toThrow(
      "Caixinha não encontrada."
    );
  });

  it.each([0, -10, NaN])("falha se o valor for inválido (%s)", async (amount) => {
    await expect(useCase.executar({ goalId: "goal-1", amount })).rejects.toThrow(
      "o valor do depósito deve ser maior que zero."
    );
  });
});
