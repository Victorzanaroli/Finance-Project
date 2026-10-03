/**
 * src/adapters/hooks/useDashboard.ts
 *
 * Camada: Adapters — Hook React que adapta o ObterResumoFinanceiroUseCase
 * para o ciclo de vida de componentes React.
 *
 * SKILL.md seção 10:
 *  "hooks React ficam em adapters/ — eles adaptam o use case pro ciclo
 *   de vida de componente, não substituem o use case."
 *
 * Este hook é a "cola" entre o caso de uso puro (Application) e a tela
 * (UI/Expo Router). Ele gerencia loading, erro e re-fetch.
 */

import { useState, useEffect, useCallback } from "react";
import type { ResumoFinanceiro } from "../../application/use-cases/ObterResumoFinanceiroUseCase";
import { obterResumoFinanceiroUseCase } from "../composition-root";

interface UseDashboardState {
  resumo: ResumoFinanceiro | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para a tela de Dashboard.
 * @param mesReferencia - Formato "YYYY-MM". Padrão: mês atual.
 */
export function useDashboard(mesReferencia?: string): UseDashboardState {
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await obterResumoFinanceiroUseCase.executar(mesReferencia);
      setResumo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  }, [mesReferencia]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { resumo, isLoading, error, refetch: fetch };
}
