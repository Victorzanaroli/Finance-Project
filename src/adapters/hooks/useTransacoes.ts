/**
 * src/adapters/hooks/useTransacoes.ts
 *
 * Camada: Adapters — Hook especializado para listagem e exclusão de transações.
 */

import { useState, useEffect, useCallback } from "react";
import { transactionRepository } from "../composition-root";
import type { Transaction } from "../../domain/entities/Transaction";

interface UseTransacoesResult {
  transacoes: Transaction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  deletarTransacao: (id: string) => Promise<boolean>;
  atualizarTransacao: (transaction: Transaction) => Promise<boolean>;
}

export function useTransacoes(): UseTransacoesResult {
  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const lista = await transactionRepository.buscarTodas();
      setTransacoes(lista);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar transações");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deletarTransacao = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await transactionRepository.deletar(id);
        await fetch();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao deletar transação");
        return false;
      }
    },
    [fetch]
  );

  const atualizarTransacao = useCallback(
    async (transaction: Transaction): Promise<boolean> => {
      try {
        await transactionRepository.atualizar(transaction);
        await fetch();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao atualizar transação");
        return false;
      }
    },
    [fetch]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { transacoes, isLoading, error, refetch: fetch, deletarTransacao, atualizarTransacao };
}
