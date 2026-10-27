/**
 * src/domain/repositories/IShoppingItemRepository.ts
 *
 * Camada: Domínio — Porta (Interface) para persistência da Lista de Compras.
 * REGRA ABSOLUTA: Interface pura — sem imports de SQLite ou Drizzle.
 */

export type ShoppingCategory = "Todos" | "Mercado" | "Desejos/Roupas";

export interface ShoppingItemEntity {
  id: string;
  name: string;
  estimatedValue: string;
  isBought: boolean;
  category: Exclude<ShoppingCategory, "Todos">;
  updatedAt: number;
}

export interface IShoppingItemRepository {
  buscarTodos(): Promise<ShoppingItemEntity[]>;
  salvar(item: ShoppingItemEntity): Promise<void>;
  atualizar(item: ShoppingItemEntity): Promise<void>;
  deletar(id: string): Promise<void>;
  deletarTodos(): Promise<void>;
}
