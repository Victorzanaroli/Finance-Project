/**
 * src/application/use-cases/ObterResumoFinanceiroUseCase.ts
 *
 * Camada: Aplicação — Caso de Uso "Obter Resumo Financeiro".
 *
 * Calcula os dados do Dashboard para um mês: receitas, despesas fixas e
 * variáveis, saldo livre, despesas por categoria (alimenta o gráfico — antes
 * o gráfico usava percentuais FICTÍCIOS fixos), caixinhas e quantidade de
 * registros ainda não sincronizados.
 *
 * REGRAS: Sem imports de infraestrutura.
 */

import type { Goal } from "../../domain/entities/Goal";
import type { IGoalRepository } from "../../domain/repositories/IGoalRepository";
import type { ITransactionRepository } from "../../domain/repositories/ITransactionRepository";
import { mesISO, mesReferenciaValido } from "../../domain/value-objects/DataFinanceira";

// ─────────────────────────────────────────────────────────────────────────────
// DTOs de saída
// ─────────────────────────────────────────────────────────────────────────────

export interface DespesaPorCategoria {
  categoria: string;
  total: number;
  /** Percentual inteiro sobre o total de despesas do mês. */
  percentual: number;
}

export interface ResumoFinanceiro {
  /** Total de receitas do mês (income). */
  totalReceitas: number;
  /** Total de despesas fixas do mês (expense + isFixed = true). */
  totalDespesasFixas: number;
  /** Total de despesas variáveis do mês (expense + isFixed = false). */
  totalDespesasVariaveis: number;
  /** Fixas + variáveis. */
  totalDespesas: number;
  /** Saldo livre: receitas - todas as despesas. */
  saldoLivre: number;
  /** Despesas agrupadas por categoria, da maior para a menor. */
  despesasPorCategoria: DespesaPorCategoria[];
  /** Lista de caixinhas para exibição no Dashboard. */
  caixinhas: Goal[];
  /** Registros (transações + caixinhas) com sync pendente ou com erro. */
  pendentesSincronizacao: number;
  /** Mês de referência no formato "YYYY-MM". */
  mesReferencia: string;
}

/** Arredonda em centavos (evita 0.1 + 0.2 = 0.30000000000000004). */
const arredondar = (valor: number): number => Math.round(valor * 100) / 100;

// ─────────────────────────────────────────────────────────────────────────────
// Caso de Uso
// ─────────────────────────────────────────────────────────────────────────────

export class ObterResumoFinanceiroUseCase {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly goalRepository: IGoalRepository
  ) {}

  /**
   * @param mesReferencia - Formato "YYYY-MM". Padrão: mês LOCAL atual.
   */
  async executar(mesReferencia?: string): Promise<ResumoFinanceiro> {
    const mes = mesReferencia ?? mesISO();
    if (!mesReferenciaValido(mes)) {
      throw new Error("ObterResumoFinanceiroUseCase: mesReferencia deve estar no formato YYYY-MM.");
    }

    // Consultas independentes em paralelo.
    const [transactions, caixinhas, txPendentes, txErro, goalsPendentes, goalsErro] = await Promise.all([
      this.transactionRepository.buscarTodas({ month: mes }),
      this.goalRepository.buscarTodas(),
      this.transactionRepository.buscarPorSyncStatus("pending"),
      this.transactionRepository.buscarPorSyncStatus("error"),
      this.goalRepository.buscarPorSyncStatus("pending"),
      this.goalRepository.buscarPorSyncStatus("error"),
    ]);

    let totalReceitas = 0;
    let totalDespesasFixas = 0;
    let totalDespesasVariaveis = 0;
    const porCategoria = new Map<string, number>();

    for (const t of transactions) {
      if (t.type === "income") {
        totalReceitas += t.amount;
        continue;
      }
      if (t.isFixed) {
        totalDespesasFixas += t.amount;
      } else {
        totalDespesasVariaveis += t.amount;
      }
      porCategoria.set(t.category, (porCategoria.get(t.category) ?? 0) + t.amount);
    }

    totalReceitas = arredondar(totalReceitas);
    totalDespesasFixas = arredondar(totalDespesasFixas);
    totalDespesasVariaveis = arredondar(totalDespesasVariaveis);
    const totalDespesas = arredondar(totalDespesasFixas + totalDespesasVariaveis);

    const despesasPorCategoria: DespesaPorCategoria[] = [...porCategoria.entries()]
      .map(([categoria, total]) => ({
        categoria,
        total: arredondar(total),
        percentual: Math.round((total / totalDespesas) * 100),
      }))
      .sort((a, b) => b.total - a.total);

    return {
      totalReceitas,
      totalDespesasFixas,
      totalDespesasVariaveis,
      totalDespesas,
      saldoLivre: arredondar(totalReceitas - totalDespesas),
      despesasPorCategoria,
      caixinhas,
      pendentesSincronizacao:
        txPendentes.length + txErro.length + goalsPendentes.length + goalsErro.length,
      mesReferencia: mes,
    };
  }
}
