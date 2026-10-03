/**
 * src/__tests__/application/ProvisoesUseCases.test.ts
 *
 * Antes essa orquestração (título, categoria, data, validação de lucro) estava
 * dentro de hooks React (useCalculadoras) — fora da camada de aplicação e
 * impossível de testar sem renderizar componentes.
 */

import { RegistrarTransacaoUseCase } from "../../application/use-cases/RegistrarTransacaoUseCase";
import { SalvarProvisaoRefeitorioUseCase } from "../../application/use-cases/SalvarProvisaoRefeitorioUseCase";
import { SalvarProvisaoUberUseCase } from "../../application/use-cases/SalvarProvisaoUberUseCase";
import { FakeUuidGenerator, InMemoryTransactionRepository } from "../helpers/fakes";

describe("Provisões das calculadoras", () => {
  let repo: InMemoryTransactionRepository;
  let registrar: RegistrarTransacaoUseCase;

  beforeEach(() => {
    repo = new InMemoryTransactionRepository();
    registrar = new RegistrarTransacaoUseCase(repo, new FakeUuidGenerator());
  });

  describe("SalvarProvisaoUberUseCase", () => {
    it("registra o lucro líquido do período como receita fixa 'Aplicativo' no dia 09", async () => {
      const t = await new SalvarProvisaoUberUseCase(registrar).executar({ mes: 2, ano: 2025 });

      expect(t).toMatchObject({
        title: "Provisão Uber — Fevereiro/2025",
        amount: 1390,
        type: "income",
        category: "Aplicativo",
        isFixed: true,
        date: "2025-02-09",
        syncStatus: "pending",
      });
      expect(repo.store).toHaveLength(1);
    });

    it("rejeita mês inválido sem persistir", async () => {
      await expect(new SalvarProvisaoUberUseCase(registrar).executar({ mes: 13, ano: 2025 })).rejects.toThrow(
        "mês deve ser um inteiro entre 1 e 12"
      );
      expect(repo.store).toHaveLength(0);
    });
  });

  describe("SalvarProvisaoRefeitorioUseCase", () => {
    it("registra o custo do mês como despesa fixa 'Faculdade' no dia 01", async () => {
      const t = await new SalvarProvisaoRefeitorioUseCase(registrar).executar({ mes: 1, ano: 2025 });

      expect(t).toMatchObject({
        title: "Provisão Refeitório — Janeiro/2025",
        amount: 179.4,
        type: "expense",
        category: "Faculdade",
        isFixed: true,
        date: "2025-01-01",
      });
    });

    it("rejeita mês inválido sem persistir", async () => {
      await expect(
        new SalvarProvisaoRefeitorioUseCase(registrar).executar({ mes: 0, ano: 2025 })
      ).rejects.toThrow("mês deve ser um inteiro entre 1 e 12");
      expect(repo.store).toHaveLength(0);
    });
  });
});
