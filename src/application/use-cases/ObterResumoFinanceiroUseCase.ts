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
import {
  calcularProximosGastosFixos,
  type ProximoGastoFixo,
} from "../../domain/services/AlertasGastosFixos";
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

export interface HistoricoMensalItem {
  mesReferencia: string;
  labelCurto: string;
  receitas: number;
  despesas: number;
}

export interface ResumoFinanceiro {
  /** Total de receitas consolidadas do mês (income, isForecast = false). */
  totalReceitas: number;
  /** Total de despesas fixas consolidadas do mês (expense + isFixed = true). */
  totalDespesasFixas: number;
  /** Total de despesas variáveis consolidadas do mês (expense + isFixed = false). */
  totalDespesasVariaveis: number;
  /** Fixas + variáveis consolidadas. */
  totalDespesas: number;
  /** Saldo livre: receitas - todas as despesas consolidadas. */
  saldoLivre: number;
  /** Total de despesas marcadas apenas como previsão (isForecast = true). */
  totalPrevisoesDespesas: number;
  /** Total de receitas marcadas apenas como previsão (isForecast = true). */
  totalPrevisoesReceitas: number;
  /** Despesas agrupadas por categoria, da maior para a menor. */
  despesasPorCategoria: DespesaPorCategoria[];
  /** Despesas consolidadas do mês divididas nas 4 semanas [Sem 1, Sem 2, Sem 3, Sem 4]. */
  despesasPorSemana: [number, number, number, number];
  /** Evolução real dos últimos 6 meses até mesReferencia. */
  historicoMensal: HistoricoMensalItem[];
  /** Lista de caixinhas para exibição no Dashboard. */
  caixinhas: Goal[];
  /** Registros (transações + caixinhas) com sync pendente ou com erro. */
  pendentesSincronizacao: number;
  /** Mês de referência no formato "YYYY-MM". */
  mesReferencia: string;
  /** Lista de próximos gastos/receitas fixas a vencer nos próximos 31 dias. */
  proximosGastosFixos: ProximoGastoFixo[];
}

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function gerarUltimosSeisMeses(mesReferencia: string): { mesReferencia: string; labelCurto: string }[] {
  const [anoStr, mesStr] = mesReferencia.split("-");
  const anoBase = Number(anoStr);
  const mesBase = Number(mesStr) - 1;
  const resultado: { mesReferencia: string; labelCurto: string }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(anoBase, mesBase - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    resultado.push({
      mesReferencia: `${y}-${m}`,
      labelCurto: MESES_CURTOS[d.getMonth()],
    });
  }
  return resultado;
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
    const [
      transactions,
      todasTransacoes,
      transacoesFixas,
      caixinhas,
      txPendentes,
      txErro,
      goalsPendentes,
      goalsErro,
    ] = await Promise.all([
      this.transactionRepository.buscarTodas({ month: mes }),
      this.transactionRepository.buscarTodas(),
      this.transactionRepository.buscarTodas({ isFixed: true }),
      this.goalRepository.buscarTodas(),
      this.transactionRepository.buscarPorSyncStatus("pending"),
      this.transactionRepository.buscarPorSyncStatus("error"),
      this.goalRepository.buscarPorSyncStatus("pending"),
      this.goalRepository.buscarPorSyncStatus("error"),
    ]);

    let totalReceitas = 0;
    let totalDespesasFixas = 0;
    let totalDespesasVariaveis = 0;
    let totalPrevisoesDespesas = 0;
    let totalPrevisoesReceitas = 0;
    const porCategoria = new Map<string, number>();
    const semanas: [number, number, number, number] = [0, 0, 0, 0];

    for (const t of transactions) {
      if (t.isForecast) {
        if (t.type === "income") {
          totalPrevisoesReceitas += t.amount;
        } else {
          totalPrevisoesDespesas += t.amount;
        }
        continue;
      }

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

      const dia = Number(t.date.slice(8, 10)) || 1;
      const indiceSemana = dia <= 7 ? 0 : dia <= 14 ? 1 : dia <= 21 ? 2 : 3;
      semanas[indiceSemana] = arredondar(semanas[indiceSemana] + t.amount);
    }

    totalReceitas = arredondar(totalReceitas);
    totalDespesasFixas = arredondar(totalDespesasFixas);
    totalDespesasVariaveis = arredondar(totalDespesasVariaveis);
    totalPrevisoesDespesas = arredondar(totalPrevisoesDespesas);
    totalPrevisoesReceitas = arredondar(totalPrevisoesReceitas);
    const totalDespesas = arredondar(totalDespesasFixas + totalDespesasVariaveis);

    const despesasPorCategoria: DespesaPorCategoria[] = [...porCategoria.entries()]
      .map(([categoria, total]) => ({
        categoria,
        total: arredondar(total),
        percentual: totalDespesas > 0 ? Math.round((total / totalDespesas) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const ultimosMeses = gerarUltimosSeisMeses(mes);
    const historicoMensal: HistoricoMensalItem[] = ultimosMeses.map((item) => {
      let rec = 0;
      let desp = 0;
      for (const tx of todasTransacoes) {
        if (tx.isForecast || !tx.date.startsWith(item.mesReferencia)) continue;
        if (tx.type === "income") {
          rec += tx.amount;
        } else {
          desp += tx.amount;
        }
      }
      return {
        mesReferencia: item.mesReferencia,
        labelCurto: item.labelCurto,
        receitas: arredondar(rec),
        despesas: arredondar(desp),
      };
    });

    const proximosGastosFixos = calcularProximosGastosFixos(transacoesFixas);

    return {
      totalReceitas,
      totalDespesasFixas,
      totalDespesasVariaveis,
      totalDespesas,
      saldoLivre: arredondar(totalReceitas - totalDespesas),
      totalPrevisoesDespesas,
      totalPrevisoesReceitas,
      despesasPorCategoria,
      despesasPorSemana: semanas,
      historicoMensal,
      caixinhas,
      pendentesSincronizacao:
        txPendentes.length + txErro.length + goalsPendentes.length + goalsErro.length,
      mesReferencia: mes,
      proximosGastosFixos,
    };
  }
}
