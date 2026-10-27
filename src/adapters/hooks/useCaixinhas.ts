/**
 * src/adapters/hooks/useCaixinhas.ts
 *
 * Camada: Adapters — Hook especializado para a seção de Caixinhas (Cofres e Metas).
 *
 * Adapta ListarCaixinhasUseCase, DepositarCaixinhaUseCase e criação/exclusão de metas
 * para o ciclo de vida React.
 */

import { useState, useEffect, useCallback } from "react";
import {
  listarCaixinhasUseCase,
  depositarCaixinhaUseCase,
  goalRepository,
} from "../composition-root";
import { ExpoUuidGenerator } from "../gateways/uuid/ExpoUuidGenerator";
import { Goal } from "../../domain/entities/Goal";
import type { ListarCaixinhasResult } from "../../application/use-cases/ListarCaixinhasUseCase";

const uuidGen = new ExpoUuidGenerator();

interface UseCaixinhasResult {
  resultado: ListarCaixinhasResult | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  depositar: (goalId: string, valor: number, category?: string) => Promise<boolean>;
  criarCaixinha: (title: string, targetAmount: number, colorHex?: string) => Promise<boolean>;
  excluirCaixinha: (goalId: string) => Promise<boolean>;
}

export function useCaixinhas(): UseCaixinhasResult {
  const [resultado, setResultado] = useState<ListarCaixinhasResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (silencioso = false) => {
    if (!silencioso) setIsLoading(true);
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
        await fetch(true);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao depositar na caixinha");
        return false;
      }
    },
    [fetch]
  );

  const criarCaixinha = useCallback(
    async (title: string, targetAmount: number, colorHex = "#8b5cf6"): Promise<boolean> => {
      try {
        const novaGoal = Goal.criar({
          id: uuidGen.gerar(),
          title: title.trim(),
          targetAmount,
          colorHex,
        });
        await goalRepository.salvar(novaGoal);
        await fetch(true);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao criar nova meta");
        return false;
      }
    },
    [fetch]
  );

  const excluirCaixinha = useCallback(
    async (goalId: string): Promise<boolean> => {
      try {
        await goalRepository.deletar(goalId);
        await fetch(true);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao excluir meta");
        return false;
      }
    },
    [fetch]
  );

  useEffect(() => {
    fetch(false);
  }, [fetch]);

  const refetch = useCallback(() => fetch(true), [fetch]);

  return {
    resultado,
    isLoading,
    error,
    refetch,
    depositar,
    criarCaixinha,
    excluirCaixinha,
  };
}
