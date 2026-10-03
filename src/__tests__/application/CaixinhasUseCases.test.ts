/**
 * src/__tests__/application/CaixinhasUseCases.test.ts
 *
 * ListarCaixinhasUseCase e LimparDadosUseCase.
 */

import { LimparDadosUseCase } from "../../application/use-cases/LimparDadosUseCase";
import { ListarCaixinhasUseCase } from "../../application/use-cases/ListarCaixinhasUseCase";
import { Goal } from "../../domain/entities/Goal";
import { Transaction } from "../../domain/entities/Transaction";
import { FakeUuidGenerator, InMemoryGoalRepository, InMemoryTransactionRepository } from "../helpers/fakes";

const goal = (id: string, current: number, target: number) =>
  Goal.criar({ id, title: id, targetAmount: target, currentAmount: current, colorHex: "#7c3aed" });

describe("ListarCaixinhasUseCase", () => {
  let repo: InMemoryGoalRepository;
  let useCase: ListarCaixinhasUseCase;

  beforeEach(() => {
    repo = new InMemoryGoalRepository();
    useCase = new ListarCaixinhasUseCase(repo, new FakeUuidGenerator("g"));
  });

  it("primeiro acesso: cria e persiste as caixinhas padrão com IDs gerados", async () => {
    const r = await useCase.executar();

    expect(r.caixinhas.map((c) => c.title).sort()).toEqual(["Poupança", "Reserva da Moto"]);
    expect(repo.store).toHaveLength(2);
    expect(repo.store.map((c) => c.id)).toEqual(["g-1", "g-2"]);
  });

  it("não recria o seed quando já existem caixinhas", async () => {
    await repo.salvar(goal("a", 10, 100));
    const r = await useCase.executar();
    expect(r.caixinhas).toHaveLength(1);
    expect(repo.store).toHaveLength(1);
  });

  it("ordena: em andamento por % decrescente, concluídas por último", async () => {
    await repo.salvar(goal("baixa", 10, 100)); // 10%
    await repo.salvar(goal("cheia", 100, 100)); // concluída
    await repo.salvar(goal("alta", 80, 100)); // 80%

    const r = await useCase.executar();

    expect(r.caixinhas.map((c) => c.id)).toEqual(["alta", "baixa", "cheia"]);
  });

  it("ordena corretamente também quando a concluída aparece antes na lista de entrada", async () => {
    await repo.salvar(goal("cheia", 100, 100));
    await repo.salvar(goal("meio", 50, 100));

    const r = await useCase.executar();

    expect(r.caixinhas.map((c) => c.id)).toEqual(["meio", "cheia"]);
  });

  it("agrega total acumulado, total da meta e percentual geral", async () => {
    await repo.salvar(goal("a", 50, 100));
    await repo.salvar(goal("b", 100, 300));

    const r = await useCase.executar();

    expect(r.totalAcumulado).toBe(150);
    expect(r.totalMeta).toBe(400);
    expect(r.percentualGeral).toBe(37); // floor(37,5)
  });
});

describe("LimparDadosUseCase", () => {
  it("apaga transações e caixinhas e refaz o seed com IDs gerados", async () => {
    const txRepo = new InMemoryTransactionRepository();
    const goalRepo = new InMemoryGoalRepository();
    await txRepo.salvar(
      Transaction.criar({
        id: "t1",
        title: "x",
        amount: 1,
        type: "expense",
        category: "Casa",
        isFixed: false,
        date: "2025-01-01",
      })
    );
    await goalRepo.salvar(goal("velha", 5, 10));

    await new LimparDadosUseCase(txRepo, goalRepo, new FakeUuidGenerator("seed")).executar();

    expect(txRepo.store).toHaveLength(0);
    expect(goalRepo.store.map((g) => [g.id, g.title, g.targetAmount, g.currentAmount])).toEqual([
      ["seed-1", "Poupança", 500, 0],
      ["seed-2", "Reserva da Moto", 150, 0],
    ]);
  });
});
