/**
 * src/adapters/hooks/useRegistrarTransacao.ts
 *
 * Camada: Adapters — Hook React para o RegistrarTransacaoUseCase.
 */

import { useState, useCallback } from "react";
import type { RegistrarTransacaoInput } from "../../application/use-cases/RegistrarTransacaoUseCase";
import type { Transaction } from "../../domain/entities/Transaction";
import { registrarTransacaoUseCase } from "../composition-root";

interface UseRegistrarTransacaoState {
  isLoading: boolean;
  error: string | null;
  registrar: (input: RegistrarTransacaoInput) => Promise<Transaction | null>;
}

export function useRegistrarTransacao(): UseRegistrarTransacaoState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registrar = useCallback(
    async (input: RegistrarTransacaoInput): Promise<Transaction | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const transaction = await registrarTransacaoUseCase.executar(input);
        return transaction;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao registrar transação");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { isLoading, error, registrar };
}
