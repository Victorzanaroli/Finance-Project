/**
 * src/adapters/services/AppBootstrapper.ts
 *
 * Camada: Adapters — Serviço de inicialização da aplicação.
 *
 * PROBLEMA QUE RESOLVE:
 *   O root layout (app/_layout.tsx) precisava chamar `runMigrations()`
 *   diretamente de `src/infra/db/client`, acoplando UI à camada de infra.
 *
 * SOLUÇÃO (Clean Architecture):
 *   Este adapter encapsula toda a lógica de inicialização (migrations,
 *   configurações futuras de crash reporting, etc.) e expõe uma interface
 *   limpa `AppBootstrapper.initialize()` para a UI chamar — sem que a UI
 *   precise saber que existe expo-sqlite, Drizzle ou qualquer outra infra.
 *
 * REGRA DE DEPENDÊNCIA mantida:
 *   UI (app/_layout.tsx)
 *     → AppBootstrapper (adapters/)      ← única dependência da UI
 *       → runMigrations() (infra/)       ← infra fica escondida aqui
 *
 * Rastreabilidade SKILL.md §10 (Clean Architecture):
 *   "camada externa depende da interna, nunca o contrário"
 *   "expo-sqlite só aparece dentro de Infra/Adapters, nunca importado em UI"
 */

import { runMigrations } from "../../infra/db/client";

export class AppBootstrapper {
  /**
   * Inicializa toda a infraestrutura necessária para o app funcionar.
   *
   * Atualmente:
   *  - Executa migrations SQLite (cria tabelas se não existirem).
   *
   * Futuramente pode incluir:
   *  - Configuração de crash reporters (Sentry).
   *  - Verificação de atualizações de schema.
   *  - Warmup de caches.
   *
   * @throws Error se as migrations falharem (capturado no _layout.tsx).
   */
  static async initialize(): Promise<void> {
    await runMigrations();
  }
}
