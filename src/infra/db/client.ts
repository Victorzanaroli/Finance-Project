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
 * expo-sqlite gerencia o arquivo em:
 *   iOS:     Documents/ExponentExperienceData/{slug}/SQLite/{DATABASE_NAME}
 *   Android: data/data/{package}/files/SQLite/{DATABASE_NAME}
 */
const sqliteDatabase = openDatabaseSync(DATABASE_NAME, {
  enableChangeListener: true, // habilita reatividade via useLiveQuery do Drizzle
});

/**
 * Instância do Drizzle ORM tipada com o schema completo.
 * Exportada para uso exclusivo pelos adapters de repositório.
 *
 * Uso nos adapters:
 *   import { db } from '@infra/db/client';
 *   const rows = await db.select().from(schema.transactions);
 */
export const db = drizzle(sqliteDatabase, { schema });

/**
 * Migração manual inline — cria as tabelas se ainda não existirem.
 * Em produção, substitua por migrations geradas pelo `drizzle-kit generate`.
 *
 * Esta função é chamada no bootstrap da aplicação (src/infra/db/migrate.ts).
 */
export async function runMigrations(): Promise<void> {
  await sqliteDatabase.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS transactions (
      id          TEXT PRIMARY KEY NOT NULL,
      title       TEXT NOT NULL,
      amount      REAL NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category    TEXT NOT NULL,
      is_fixed    INTEGER NOT NULL DEFAULT 0,
      date        TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending'
                       CHECK(sync_status IN ('pending', 'synced', 'error')),
      updated_at  INTEGER NOT NULL
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
  `);
}
