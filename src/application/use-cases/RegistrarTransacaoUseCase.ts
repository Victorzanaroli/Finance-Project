/**
 * src/application/use-cases/RegistrarTransacaoUseCase.ts
 *
 * Camada: Aplicação — Caso de Uso "Registrar Transação".
 *
 * REGRAS:
 *  1. Sem imports de expo-sqlite, drizzle-orm, expo-*, @supabase/* aqui.
 *  2. Orquestra entidade de domínio + interface de repositório.
 *  3. Gera UUID no cliente (via interface IUuidGenerator — não acessa
 *     expo-crypto diretamente; a implementação concreta fica no adapter).
 *
 * Rastreabilidade (SKILL.md seção 6):
 *  - Boundary de UI: TransacoesScreen (chama este use case via hook)
 *  - Control: este arquivo
 *  - Entities: Transaction
 *  - Repository port: ITransactionRepository
 *
 * Diagrama de sequência simplificado (SKILL.md seção 7):
 *   UI → RegistrarTransacaoUseCase.executar(input)
 *        → Transaction.criar(...)        [valida invariantes]
 *        → ITransactionRepository.salvar(transaction)
 *        → retorna Transaction salva
 */

import { Transaction, type TransactionType } from "../../domain/entities/Transaction";
import type { IUuidGenerator } from "../../domain/gateways/IUuidGenerator";
import type { ITransactionRepository } from "../../domain/repositories/ITransactionRepository";
import { hojeISO } from "../../domain/value-objects/DataFinanceira";

// ─────────────────────────────────────────────────────────────────────────────
// DTO de entrada (Data Transfer Object)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dados fornecidos pela UI para registrar uma nova transação.
 * Não inclui id, syncStatus, updatedAt — esses são responsabilidade
 * do use case e da entidade de domínio.
 */
export interface RegistrarTransacaoInput {
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  isFixed: boolean;
  /** Formato ISO 8601: "YYYY-MM-DD". Padrão: data de hoje. */
  date?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Caso de Uso
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RegistrarTransacaoUseCase — orquestra o registro de uma nova transação.
 *
 * Responsabilidades:
 *  1. Gerar UUID no cliente (via IUuidGenerator).
 *  2. Criar a entidade Transaction (que valida invariantes e define sync_status = 'pending').
 *  3. Persistir via ITransactionRepository.salvar().
 *  4. Retornar a entidade salva (para a UI exibir feedback imediato).
 *
 * NÃO é responsabilidade deste use case:
 *  - Sincronizar com Supabase (isso é do SincronizarFilaUseCase).
 *  - Gerenciar estado de UI (isso é do hook/adapter de tela).
 */
export class RegistrarTransacaoUseCase {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly uuidGenerator: IUuidGenerator
  ) {}

  /**
   * Executa o caso de uso.
   *
   * @param input - Dados da transação fornecidos pela UI.
   * @returns A Transaction persistida, com id e syncStatus = 'pending'.
   * @throws Error se a entidade Transaction detectar invariante violada.
   */
  async executar(input: RegistrarTransacaoInput): Promise<Transaction> {
    // 1. Gerar UUID no cliente — offline-first: nunca dependemos do servidor para o ID.
    const id = this.uuidGenerator.gerar();

    // 2. Criar a entidade — Transaction.criar() valida invariantes e define:
    //    - syncStatus: 'pending' (sempre, para entrar na fila de sync)
    //    - updatedAt: Date.now() (para last-write-wins na resolução de conflito)
    const transaction = Transaction.criar({
      id,
      title: input.title.trim(),
      amount: input.amount,
      type: input.type,
      category: input.category,
      isFixed: input.isFixed,
      date: input.date ?? hojeISO(),
    });

    // 3. Persistir localmente — o repositório grava no SQLite via Drizzle.
    //    Esta operação é sempre bem-sucedida do ponto de vista do usuário
    //    (padrão offline-first — SKILL.md seção 7).
    await this.transactionRepository.salvar(transaction);

    // 4. Retornar a entidade criada para o caller poder atualizar a UI.
    return transaction;
  }
}
