/**
 * src/adapters/repositories/ShoppingItemRepositorySQLite.ts
 *
 * Camada: Adapters — Implementação SQLite (Drizzle) de IShoppingItemRepository.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "../../infra/db/client";
import { shoppingItems } from "../../infra/db/schema";
import type { ShoppingItemRow, NewShoppingItemRow } from "../../infra/db/schema";
import type {
  IShoppingItemRepository,
  ShoppingItemEntity,
} from "../../domain/repositories/IShoppingItemRepository";

function rowToEntity(row: ShoppingItemRow): ShoppingItemEntity {
  return {
    id: row.id,
    name: row.name,
    estimatedValue: row.estimated_value,
    isBought: Boolean(row.is_bought),
    category: (row.category === "Desejos/Roupas" ? "Desejos/Roupas" : "Mercado"),
    updatedAt: row.updated_at,
  };
}

function entityToRow(item: ShoppingItemEntity): NewShoppingItemRow {
  return {
    id: item.id,
    name: item.name,
    estimated_value: item.estimatedValue,
    is_bought: item.isBought,
    category: item.category,
    updated_at: item.updatedAt,
  };
}

export class ShoppingItemRepositorySQLite implements IShoppingItemRepository {
  async buscarTodos(): Promise<ShoppingItemEntity[]> {
    const rows = await db
      .select()
      .from(shoppingItems)
      .orderBy(sql`${shoppingItems.updated_at} DESC`);
    return rows.map(rowToEntity);
  }

  async salvar(item: ShoppingItemEntity): Promise<void> {
    await db.insert(shoppingItems).values(entityToRow(item));
  }

  async atualizar(item: ShoppingItemEntity): Promise<void> {
    await db
      .update(shoppingItems)
      .set(entityToRow(item))
      .where(eq(shoppingItems.id, item.id));
  }

  async deletar(id: string): Promise<void> {
    await db.delete(shoppingItems).where(eq(shoppingItems.id, id));
  }

  async deletarTodos(): Promise<void> {
    await db.delete(shoppingItems);
  }
}
