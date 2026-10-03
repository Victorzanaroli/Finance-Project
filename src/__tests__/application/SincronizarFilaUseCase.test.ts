/**
 * src/__tests__/application/SincronizarFilaUseCase.test.ts
 *
 * Fluxo offline-first (SKILL.md seções 5, 7, 8 e 10):
 *  - RNF "sem rede": não tenta enviar, nada muda.
 *  - pending → synced em caso de sucesso.
 *  - pending → error em caso de falha (inclusive exceção do gateway).
 *  - error → pending (retry, preservando updatedAt) → synced.
 */

import { SincronizarFilaUseCase } from "../../application/use-cases/SincronizarFilaUseCase";
import { Goal } from "../../domain/entities/Goal";
import { Transaction } from "../../domain/entities/Transaction";
import {
  FakeNetworkGateway,
  FakeSyncGateway,
  InMemoryGoalRepository,
  InMemoryTransactionRepository,
} from "../helpers/fakes";

const tx = (id: string) =>
  Transaction.criar({
    id,
    title: id,
    amount: 10,
    type: "expense",
    category: "Casa",
    isFixed: false,
    date: "2025-01-01",
  });

const goal = (id: string) => Goal.criar({ id, title: id, targetAmount: 100, colorHex: "#7c3aed" });

describe("SincronizarFilaUseCase", () => {
  let txRepo: InMemoryTransactionRepository;
  let goalRepo: InMemoryGoalRepository;
  let gateway: FakeSyncGateway;
  let rede: FakeNetworkGateway;
  let useCase: SincronizarFilaUseCase;

  beforeEach(() => {
    txRepo = new InMemoryTransactionRepository();
    goalRepo = new InMemoryGoalRepository();
    gateway = new FakeSyncGateway();
    rede = new FakeNetworkGateway(true);
    useCase = new SincronizarFilaUseCase(txRepo, goalRepo, gateway, rede);
  });

  it("SEM REDE: não envia nada e mantém tudo 'pending'", async () => {
    rede.conectado = false;
    await txRepo.salvar(tx("t1"));
    await goalRepo.salvar(goal("g1"));

    const r = await useCase.executar();

    expect(r).toEqual({ status: "offline", enviados: 0, falhas: 0, erros: [] });
    expect(gateway.transacoesEnviadas).toHaveLength(0);
    expect(gateway.goalsEnviadas).toHaveLength(0);
    expect(txRepo.store[0].syncStatus).toBe("pending");
    expect(goalRepo.store[0].syncStatus).toBe("pending");
  });

  it("COM REDE: envia pendentes e marca transações e caixinhas como 'synced'", async () => {
    await txRepo.salvar(tx("t1"));
    await txRepo.salvar(tx("t2"));
    await goalRepo.salvar(goal("g1"));

    const r = await useCase.executar();

    expect(r).toEqual({ status: "concluido", enviados: 3, falhas: 0, erros: [] });
    expect(txRepo.store.every((t) => t.syncStatus === "synced")).toBe(true);
    expect(goalRepo.store[0].syncStatus).toBe("synced");
  });

  it("não reenvia o que já está 'synced'", async () => {
    await txRepo.salvar(tx("t1").marcarSincronizado());

    const r = await useCase.executar();

    expect(r.enviados).toBe(0);
    expect(gateway.transacoesEnviadas).toHaveLength(0);
  });

  it("FALHA do servidor: marca 'error', registra a mensagem e continua com os demais", async () => {
    await txRepo.salvar(tx("ruim"));
    await txRepo.salvar(tx("boa"));
    gateway.falhasPorId.set("ruim", "RLS negou");

    const r = await useCase.executar();

    expect(r.enviados).toBe(1);
    expect(r.falhas).toBe(1);
    expect(r.erros).toEqual(["ruim: RLS negou"]);
    expect(txRepo.store.find((t) => t.id === "ruim")?.syncStatus).toBe("error");
    expect(txRepo.store.find((t) => t.id === "boa")?.syncStatus).toBe("synced");
  });

  it("FALHA sem mensagem: usa texto padrão", async () => {
    await goalRepo.salvar(goal("g1"));
    gateway.falhasPorId.set("g1", "");

    const r = await useCase.executar();

    expect(r.erros).toEqual(["g1: Falha desconhecida"]);
    expect(goalRepo.store[0].syncStatus).toBe("error");
  });

  it("EXCEÇÃO do gateway é tratada como falha (não derruba a fila)", async () => {
    await txRepo.salvar(tx("explode"));
    await txRepo.salvar(tx("ok"));
    gateway.excecoesPorId.add("explode");

    const r = await useCase.executar();

    expect(r.falhas).toBe(1);
    expect(r.erros[0]).toContain("explode: exceção simulada explode");
    expect(txRepo.store.find((t) => t.id === "ok")?.syncStatus).toBe("synced");
  });

  it("exceção que não é Error vira mensagem padrão", async () => {
    await txRepo.salvar(tx("t1"));
    jest.spyOn(gateway, "sincronizarTransaction").mockRejectedValueOnce("string solta");

    const r = await useCase.executar();

    expect(r.erros).toEqual(["t1: Erro desconhecido"]);
  });

  it("RETRY: item em 'error' volta para 'pending' preservando updatedAt e sincroniza", async () => {
    const comErro = Transaction.reconstituir({ ...tx("t1").toProps(), syncStatus: "error", updatedAt: 1234 });
    await txRepo.salvar(comErro);

    const r = await useCase.executar();

    expect(r.enviados).toBe(1);
    expect(gateway.transacoesEnviadas[0].syncStatus).toBe("pending");
    expect(gateway.transacoesEnviadas[0].updatedAt).toBe(1234);
    expect(txRepo.store[0].syncStatus).toBe("synced");
  });

  it("RETRY que falha de novo termina em 'error'", async () => {
    await goalRepo.salvar(goal("g1").marcarErroSync());
    gateway.falhasPorId.set("g1", "sem rede no servidor");

    const r = await useCase.executar();

    expect(r.falhas).toBe(1);
    expect(goalRepo.store[0].syncStatus).toBe("error");
  });
});
