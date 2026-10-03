/**
 * src/adapters/hooks/useDashboardData.ts
 *
 * Camada: Adapters — Hook especializado para dados financeiros do Dashboard.
 *
 * Adapta o ObterResumoFinanceiroUseCase para o ciclo de vida React.
 * Retorna os totais financeiros do mês atual com estado de loading/erro,
 * e expõe `refetch` para pull-to-refresh manual.
 *
 * Fluxo de dependência (SKILL.md §6):
 *   DashboardScreen (UI)
 *     → useDashboardData (adapters/hooks)        ← ESTE ARQUIVO
 *       → obterResumoFinanceiroUseCase (application)
 *         → ITransactionRepository + IGoalRepository (domain)
 *           → SQLite via Drizzle (infra)
 */

import { useState, useEffect, useCallback } from "react";
import { obterResumoFinanceiroUseCase } from "../composition-root";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos do hook
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardFinanceiro {
  totalReceitas: number;
  totalDespesasFixas: number;
  totalDespesasVariaveis: number;
  totalDespesas: number;
  saldoLivre: number;
  mesReferencia: string;
  /** Label formatado, ex: "Setembro 2025" */
  mesLabel: string;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function buildMesLabel(mesReferencia: string): string {
  const [ano, mes] = mesReferencia.split("-");
  return `${MESES[parseInt(mes) - 1]} ${ano}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseDashboardDataResult {
  dados: DashboardFinanceiro | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para os dados financeiros do Dashboard.
 * @param mesReferencia - Formato "YYYY-MM". Padrão: mês atual.
 */
export function useDashboardData(mesReferencia?: string): UseDashboardDataResult {
  const [dados, setDados] = useState<DashboardFinanceiro | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resumo = await obterResumoFinanceiroUseCase.executar(mesReferencia);
      setDados({
        totalReceitas: resumo.totalReceitas,
        totalDespesasFixas: resumo.totalDespesasFixas,
        totalDespesasVariaveis: resumo.totalDespesasVariaveis,
        totalDespesas: resumo.totalDespesasFixas + resumo.totalDespesasVariaveis,
        saldoLivre: resumo.saldoLivre,
        mesReferencia: resumo.mesReferencia,
        mesLabel: buildMesLabel(resumo.mesReferencia),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  }, [mesReferencia]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { dados, isLoading, error, refetch: fetch };
}
