/**
 * src/adapters/hooks/useCaixinhas.ts
 *
 * Camada: Adapters — Hook especializado para a seção de Caixinhas.
 *
 * Adapta o ListarCaixinhasUseCase e DepositarCaixinhaUseCase para o ciclo de vida React.
 * Retorna a lista de metas ordenada + métricas agregadas + função de depósito.
 */

import { useState, useEffect, useCallback } from "react";
import { listarCaixinhasUseCase, depositarCaixinhaUseCase } from "../composition-root";
import type { ListarCaixinhasResult } from "../../application/use-cases/ListarCaixinhasUseCase";

interface UseCaixinhasResult {
  resultado: ListarCaixinhasResult | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  depositar: (goalId: string, valor: number, category?: string) => Promise<boolean>;
}

export function useCaixinhas(): UseCaixinhasResult {
  const [resultado, setResultado] = useState<ListarCaixinhasResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listarCaixinhasUseCase.executar();
      setResultado(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar caixinhas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const depositar = useCallback(
    async (goalId: string, valor: number, category?: string): Promise<boolean> => {
      try {
        await depositarCaixinhaUseCase.executar({ goalId, amount: valor, category });
        await fetch();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao depositar na caixinha");
        return false;
      }
    },
    [fetch]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { resultado, isLoading, error, refetch: fetch, depositar };
}
