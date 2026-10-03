/**
 * src/__tests__/application/TransacoesUseCases.test.ts
 *
 * ListarTransacoesUseCase e ExcluirTransacaoUseCase.
 * Antes o hook useTransacoes acessava o repositório diretamente,
 * pulando a camada de aplicação.
 */

import { ExcluirTransacaoUseCase } from "../../application/use-cases/ExcluirTransacaoUseCase";
import { ListarTransacoesUseCase } from "../../application/use-cases/ListarTransacoesUseCase";
import { Transaction } from "../../domain/entities/Transaction";
import { InMemoryTransactionRepository } from "../helpers/fakes";

const tx = (id: string, date: string, updatedAt?: number) => {
  const t = Transaction.criar({
    id,
    title: id,
    amount: 10,
    type: "expense",
    category: "Casa",
    isFixed: false,
    date,
  });
  return updatedAt === undefined ? t : Transaction.reconstituir({ ...t.toProps(), updatedAt });
};

describe("ListarTransacoesUseCase", () => {
  it("ordena por data decrescente e, em empate, pela edição mais recente", async () => {
    const repo = new InMemoryTransactionRepository();
    await repo.salvar(tx("antiga", "2025-01-01", 1));
    await repo.salvar(tx("nova-velha", "2025-03-01", 10));
    await repo.salvar(tx("nova-recente", "2025-03-01", 20));

    const lista = await new ListarTransacoesUseCase(repo).executar();

    expect(lista.map((t) => t.id)).toEqual(["nova-recente", "nova-velha", "antiga"]);
  });

  it("repassa filtros ao repositório", async () => {
    const repo = new InMemoryTransactionRepository();
    await repo.salvar(tx("a", "2025-01-01"));
    await repo.salvar(tx("b", "2025-02-01"));

    const lista = await new ListarTransacoesUseCase(repo).executar({ month: "2025-02" });

    expect(lista.map((t) => t.id)).toEqual(["b"]);
  });

  it("lista vazia quando não há transações", async () => {
    expect(await new ListarTransacoesUseCase(new InMemoryTransactionRepository()).executar()).toEqual([]);
  });
});

describe("ExcluirTransacaoUseCase", () => {
  it("remove a transação existente", async () => {
    const repo = new InMemoryTransactionRepository();
    await repo.salvar(tx("a", "2025-01-01"));
    await repo.salvar(tx("b", "2025-01-02"));

    await new ExcluirTransacaoUseCase(repo).executar("a");

    expect(repo.store.map((t) => t.id)).toEqual(["b"]);
  });

  it("falha quando a transação não existe", async () => {
    await expect(new ExcluirTransacaoUseCase(new InMemoryTransactionRepository()).executar("x")).rejects.toThrow(
      "Transação não encontrada."
    );
  });
});
