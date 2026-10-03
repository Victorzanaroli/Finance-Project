/**
 * src/application/use-cases/ListarCaixinhasUseCase.ts
 *
 * Camada: Aplicação — Caso de Uso "Listar Caixinhas".
 *
 * Retorna as metas de poupança ordenadas (em andamento por % decrescente,
 * concluídas por último) com métricas agregadas. No primeiro acesso (tabela
 * vazia) cria as caixinhas padrão definidas em `criarCaixinhasPadrao`.
 */

import type { Goal } from "../../domain/entities/Goal";
import type { IUuidGenerator } from "../../domain/gateways/IUuidGenerator";
import type { IGoalRepository } from "../../domain/repositories/IGoalRepository";
import { criarCaixinhasPadrao } from "../../domain/services/CaixinhasPadrao";

export interface ListarCaixinhasResult {
  caixinhas: Goal[];
  /** Soma total do valor acumulado em todas as caixinhas. */
  totalAcumulado: number;
  /** Soma total das metas de todas as caixinhas. */
  totalMeta: number;
  /** Percentual geral de progresso de todas as metas combinadas (0-100). */
  percentualGeral: number;
}

export class ListarCaixinhasUseCase {
  constructor(
    private readonly goalRepository: IGoalRepository,
    private readonly uuidGenerator: IUuidGenerator
  ) {}

  async executar(): Promise<ListarCaixinhasResult> {
    let caixinhas = await this.goalRepository.buscarTodas();

    // SEED INICIAL: tabela vazia → cria as caixinhas padrão do domínio.
    if (caixinhas.length === 0) {
      caixinhas = criarCaixinhasPadrao(this.uuidGenerator);
      for (const caixinha of caixinhas) {
        await this.goalRepository.salvar(caixinha);
      }
    }

    // Concluídas no fim; demais por percentual decrescente.
    const ordenadas = [...caixinhas].sort((a, b) => {
      if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
      return b.percentualConcluido - a.percentualConcluido;
    });

    const totalAcumulado = caixinhas.reduce((soma, g) => soma + g.currentAmount, 0);
    const totalMeta = caixinhas.reduce((soma, g) => soma + g.targetAmount, 0);
    const percentualGeral = Math.floor((totalAcumulado / totalMeta) * 100);

    return { caixinhas: ordenadas, totalAcumulado, totalMeta, percentualGeral };
  }
}
