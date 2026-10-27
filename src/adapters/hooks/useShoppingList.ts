/**
 * src/adapters/hooks/useShoppingList.ts
 *
 * Camada: Adapters — Hook React para a Lista de Compras persistida no SQLite.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { shoppingItemRepository } from "../composition-root";
import { ExpoUuidGenerator } from "../gateways/uuid/ExpoUuidGenerator";
import type {
  ShoppingCategory,
  ShoppingItemEntity,
} from "../../domain/repositories/IShoppingItemRepository";

const uuidGen = new ExpoUuidGenerator();

function parseCurrencyString(valorStr: string): number {
  if (!valorStr) return 0;
  const limpo = valorStr
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(limpo);
  return Number.isNaN(n) ? 0 : n;
}

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingItemEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const carregarItens = useCallback(async () => {
    setIsLoading(true);
    try {
      const lista = await shoppingItemRepository.buscarTodos();
      setItems(lista);
    } catch {
      // Fallback caso ocorra erro de leitura
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarItens();
  }, [carregarItens]);

  const adicionarItem = useCallback(
    async (
      name: string,
      estimatedValue: string,
      activeCategory: ShoppingCategory
    ): Promise<boolean> => {
      const nomeLimpo = name.trim();
      if (!nomeLimpo) return false;

      const novoItem: ShoppingItemEntity = {
        id: uuidGen.gerar(),
        name: nomeLimpo,
        estimatedValue: estimatedValue.trim(),
        isBought: false,
        category: activeCategory === "Todos" ? "Mercado" : activeCategory,
        updatedAt: Date.now(),
      };

      await shoppingItemRepository.salvar(novoItem);
      setItems((prev) => [novoItem, ...prev]);
      return true;
    },
    []
  );

  const alternarComprado = useCallback(
    async (id: string) => {
      const alvo = items.find((i) => i.id === id);
      if (!alvo) return;

      const atualizado: ShoppingItemEntity = {
        ...alvo,
        isBought: !alvo.isBought,
        updatedAt: Date.now(),
      };

      await shoppingItemRepository.atualizar(atualizado);
      setItems((prev) => prev.map((i) => (i.id === id ? atualizado : i)));
    },
    [items]
  );

  const removerItem = useCallback(async (id: string) => {
    await shoppingItemRepository.deletar(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const limparComprados = useCallback(async () => {
    const comprados = items.filter((i) => i.isBought);
    for (const item of comprados) {
      await shoppingItemRepository.deletar(item.id);
    }
    setItems((prev) => prev.filter((i) => !i.isBought));
  }, [items]);

  const resumo = useMemo(() => {
    let totalEstimado = 0;
    let totalComprado = 0;
    let quantidadeComprada = 0;

    for (const item of items) {
      const val = parseCurrencyString(item.estimatedValue);
      totalEstimado += val;
      if (item.isBought) {
        totalComprado += val;
        quantidadeComprada++;
      }
    }

    return {
      totalEstimado,
      totalComprado,
      quantidadeComprada,
      quantidadeTotal: items.length,
    };
  }, [items]);

  return {
    items,
    isLoading,
    resumo,
    adicionarItem,
    alternarComprado,
    removerItem,
    limparComprados,
    recarregar: carregarItens,
    parseCurrencyString,
  };
}
