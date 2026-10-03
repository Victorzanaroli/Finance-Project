/**
 * src/application/use-cases/DepositarCaixinhaUseCase.ts
 *
 * Camada: Aplicação — Caso de Uso: Depositar em uma Caixinha de Poupança.
 *
 * RESPONSABILIDADE:
 *  1. Registrar uma transação de saída (RegistrarTransacaoUseCase) com o valor
 *     EFETIVAMENTE guardado — se o depósito excede a meta, a caixinha só recebe
 *     o que falta e a transação registra apenas esse valor (antes registrava o
 *     valor integral e o dinheiro "sumia" do Caixa Livre).
 *  2. Persistir a caixinha atualizada.
 *
 * CONSISTÊNCIA (sem Unit of Work no SQLite local):
 *  a transação é criada ANTES de atualizar a caixinha, porque é ela que passa
 *  pela validação de entrada. Se persistir a caixinha falhar, a transação é
 *  desfeita (compensação) — nunca fica um lançamento sem o depósito
 *  correspondente.
 *
 * Efeito financeiro: deduz do "Caixa Livre" no Dashboard e mantém o histórico
 * da transferência visível na aba de Lançamentos.
 */

import type { Goal } from "../../domain/entities/Goal";
import type { Transaction } from "../../domain/entities/Transaction";
import type { IGoalRepository } from "../../domain/repositories/IGoalRepository";
import type { ITransactionRepository } from "../../domain/repositories/ITransactionRepository";
import type { RegistrarTransacaoUseCase } from "./RegistrarTransacaoUseCase";

export interface DepositarCaixinhaInput {
  goalId: string;
  amount: number;
  category?: string;
}

export interface DepositarCaixinhaOutput {
  goal: Goal;
  transaction: Transaction;
}

export class DepositarCaixinhaUseCase {
  constructor(
    private readonly goalRepository: IGoalRepository,
    private readonly registrarTransacaoUseCase: RegistrarTransacaoUseCase,
    private readonly transactionRepository: ITransactionRepository
  ) {}

  async executar(input: DepositarCaixinhaInput): Promise<DepositarCaixinhaOutput> {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error("DepositarCaixinhaUseCase: o valor do depósito deve ser maior que zero.");
    }

    const goal = await this.goalRepository.buscarPorId(input.goalId);
    if (!goal) {
      throw new Error("DepositarCaixinhaUseCase: Caixinha não encontrada.");
    }

    // Regras do agregado (meta já atingida, teto da meta) ficam na entidade.
    const goalAtualizada = goal.depositar(input.amount);
    const valorEfetivo = Math.round((goalAtualizada.currentAmount - goal.currentAmount) * 100) / 100;

    const transaction = await this.registrarTransacaoUseCase.executar({
      title: `Depósito na Caixinha: ${goal.title}`,
      amount: valorEfetivo,
      type: "expense",
      category: input.category ?? "Poupança",
      isFixed: false,
    });

    try {
      await this.goalRepository.atualizar(goalAtualizada);
    } catch (erro) {
      await this.transactionRepository.deletar(transaction.id);
      throw erro;
    }

    return { goal: goalAtualizada, transaction };
  }
}
