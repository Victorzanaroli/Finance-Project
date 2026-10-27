/**
 * src/infra/db/client.ts
 *
 * Camada: Infraestrutura — Setup do cliente Drizzle + expo-sqlite.
 *
 * Este arquivo é o ponto de acoplamento com o SDK expo-sqlite.
 * Somente os adapters de repositório (src/adapters/repositories/) devem
 * importar `db` daqui. O domínio e os casos de uso NUNCA importam daqui.
 *
 * Migrations são executadas automaticamente na abertura do banco —
 * padrão adequado para app mobile onde não há controle manual de deploy.
 */

import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

// Nome fixo do arquivo do banco de dados SQLite no dispositivo.
const DATABASE_NAME = "financas.db";

/**
 * Abre o banco de dados SQLite de forma síncrona.
 */
const sqliteDatabase = openDatabaseSync(DATABASE_NAME, {
  enableChangeListener: true,
});

/**
 * Instância do Drizzle ORM tipada com o schema completo.
 * Exportada para uso exclusivo pelos adapters de repositório.
 */
export const db = drizzle(sqliteDatabase, { schema });

/**
 * Migração inline segura — cria as tabelas se ainda não existirem e garante
 * que colunas adicionadas recentemente existam em bancos antigos.
 */
export async function runMigrations(): Promise<void> {
  await sqliteDatabase.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS transactions (
      id             TEXT PRIMARY KEY NOT NULL,
      title          TEXT NOT NULL,
      amount         REAL NOT NULL,
      type           TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category       TEXT NOT NULL,
      is_fixed       INTEGER NOT NULL DEFAULT 0,
      is_forecast    INTEGER NOT NULL DEFAULT 0,
      recurrence_day TEXT,
      date           TEXT NOT NULL,
      sync_status    TEXT NOT NULL DEFAULT 'pending'
                          CHECK(sync_status IN ('pending', 'synced', 'error')),
      updated_at     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id             TEXT PRIMARY KEY NOT NULL,
      title          TEXT NOT NULL,
      target_amount  REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      color_hex      TEXT NOT NULL DEFAULT '#7c3aed',
      sync_status    TEXT NOT NULL DEFAULT 'pending'
                           CHECK(sync_status IN ('pending', 'synced', 'error')),
      updated_at     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shopping_items (
      id              TEXT PRIMARY KEY NOT NULL,
      name            TEXT NOT NULL,
      estimated_value TEXT NOT NULL DEFAULT '',
      is_bought       INTEGER NOT NULL DEFAULT 0,
      category        TEXT NOT NULL DEFAULT 'Mercado',
      updated_at      INTEGER NOT NULL
    );
  `);

  // Garante migração segura para bancos SQLite criados antes de is_forecast / recurrence_day
  try {
    await sqliteDatabase.execAsync(
      `ALTER TABLE transactions ADD COLUMN is_forecast INTEGER NOT NULL DEFAULT 0;`
    );
  } catch {
    // Coluna já existe
  }

  try {
    await sqliteDatabase.execAsync(
      `ALTER TABLE transactions ADD COLUMN recurrence_day TEXT;`
    );
  } catch {
    // Coluna já existe
  }
}
