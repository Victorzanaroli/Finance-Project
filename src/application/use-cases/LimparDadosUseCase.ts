/**
 * src/application/use-cases/LimparDadosUseCase.ts
 *
 * Caso de uso: Limpar Dados de Teste e Refazer o Seed Inicial.
 *
 *  1. Apaga todas as transações.
 *  2. Apaga todas as caixinhas.
 *  3. Recria as caixinhas padrão (fonte única: `criarCaixinhasPadrao`).
 */

import type { IUuidGenerator } from "../../domain/gateways/IUuidGenerator";
import type { IGoalRepository } from "../../domain/repositories/IGoalRepository";
import type { ITransactionRepository } from "../../domain/repositories/ITransactionRepository";
import { criarCaixinhasPadrao } from "../../domain/services/CaixinhasPadrao";

export class LimparDadosUseCase {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly goalRepository: IGoalRepository,
    private readonly uuidGenerator: IUuidGenerator
  ) {}

  async executar(): Promise<void> {
    await this.transactionRepository.deletarTodas();
    await this.goalRepository.deletarTodas();

    for (const caixinha of criarCaixinhasPadrao(this.uuidGenerator)) {
      await this.goalRepository.salvar(caixinha);
    }
  }
}
