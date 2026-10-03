/**
 * src/adapters/composition-root.ts
 *
 * Camada: Adapters — Composition Root (raiz de composição).
 *
 * Este arquivo é o ponto onde todas as dependências são "montadas" juntas.
 * É aqui que o Dependency Injection (DI) acontece — conectamos as interfaces
 * do domínio com as implementações concretas dos adapters.
 *
 * SKILL.md seção 10 (Clean Architecture):
 *  "Regra de dependência: camada externa depende da interna, nunca o contrário."
 *
 * Padrão: Poor Man's DI (sem framework de DI) — adequado para apps mobile
 * onde a complexidade de um container de DI não se justifica.
 *
 * Em testes unitários, substitua estas instâncias por fakes in-memory
 * sem precisar modificar nenhuma outra camada.
 */

// Infra / Adapters de repositório
import { TransactionRepositorySQLite } from "./repositories/TransactionRepositorySQLite";
import { GoalRepositorySQLite } from "./repositories/GoalRepositorySQLite";

// Adapters de gateway
import { ExpoUuidGenerator } from "./gateways/uuid/ExpoUuidGenerator";
import { SyncGatewaySupabase } from "./gateways/sync/SyncGatewaySupabase";

// Casos de uso da camada de aplicação
import { RegistrarTransacaoUseCase } from "../application/use-cases/RegistrarTransacaoUseCase";
import { ObterResumoFinanceiroUseCase } from "../application/use-cases/ObterResumoFinanceiroUseCase";
import { ListarCaixinhasUseCase } from "../application/use-cases/ListarCaixinhasUseCase";
import { DepositarCaixinhaUseCase } from "../application/use-cases/DepositarCaixinhaUseCase";
import { LimparDadosUseCase } from "../application/use-cases/LimparDadosUseCase";

// ─────────────────────────────────────────────────────────────────────────────
// Instâncias de repositórios (singletons por convenção — SQLite é um arquivo)
// ─────────────────────────────────────────────────────────────────────────────
export const transactionRepository = new TransactionRepositorySQLite();
export const goalRepository = new GoalRepositorySQLite();

// ─────────────────────────────────────────────────────────────────────────────
// Instâncias de gateways
// ─────────────────────────────────────────────────────────────────────────────
const uuidGenerator = new ExpoUuidGenerator();
export const syncGateway = new SyncGatewaySupabase();

// ─────────────────────────────────────────────────────────────────────────────
// Instâncias de casos de uso (exportadas para uso nos hooks/telas)
// ─────────────────────────────────────────────────────────────────────────────

/** Use case para registrar uma nova transação. */
export const registrarTransacaoUseCase = new RegistrarTransacaoUseCase(
  transactionRepository,
  uuidGenerator
);

/** Use case para calcular o resumo financeiro do Dashboard. */
export const obterResumoFinanceiroUseCase = new ObterResumoFinanceiroUseCase(
  transactionRepository,
  goalRepository
);

/** Use case dedicado para listar e agregar caixinhas de poupança. */
export const listarCaixinhasUseCase = new ListarCaixinhasUseCase(goalRepository);

/** Use case para depositar na caixinha e gerar transação espelhada. */
export const depositarCaixinhaUseCase = new DepositarCaixinhaUseCase(
  goalRepository,
  registrarTransacaoUseCase
);

/** Use case para limpar dados de teste e refazer o seed inicial. */
export const limparDadosUseCase = new LimparDadosUseCase(
  transactionRepository,
  goalRepository
);
