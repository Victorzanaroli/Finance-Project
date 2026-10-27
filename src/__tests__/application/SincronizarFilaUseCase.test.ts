/**
 * src/__tests__/application/SincronizarFilaUseCase.test.ts
 *
 * Testes de controle de status de sincronização offline-first nos repositórios locais.
 */

import { Goal } from "../../domain/entities/Goal";
import { Transaction } from "../../domain/entities/Transaction";
import { InMemoryGoalRepository, InMemoryTransactionRepository } from "../helpers/fakes";

describe("Fila Offline-First (Repositórios e Entidades)", () => {
  it("filtra corretamente transações e metas pendentes de sincronização", async () => {
    const txRepo = new InMemoryTransactionRepository();
    const goalRepo = new InMemoryGoalRepository();

    const t1 = Transaction.criar({
      id: "t1",
      title: "Luz",
      amount: 120,
      type: "expense",
      category: "Casa",
      isFixed: true,
      date: "2026-10-10",
    });
    const t2 = Transaction.criar({
      id: "t2",
      title: "Salário",
      amount: 3500,
      type: "income",
      category: "Salário",
      isFixed: true,
      date: "2026-10-05",
    }).marcarSincronizado();

    await txRepo.salvar(t1);
    await txRepo.salvar(t2);
    await goalRepo.salvar(
      Goal.criar({ id: "g1", title: "Reserva", targetAmount: 500, colorHex: "#7c3aed" })
    );

    const pendentesTx = await txRepo.buscarPorSyncStatus("pending");
    const sincronizadasTx = await txRepo.buscarPorSyncStatus("synced");
    const pendentesGoal = await goalRepo.buscarPorSyncStatus("pending");

    expect(pendentesTx).toHaveLength(1);
    expect(pendentesTx[0].id).toBe("t1");
    expect(sincronizadasTx).toHaveLength(1);
    expect(pendentesGoal).toHaveLength(1);
  });
});
