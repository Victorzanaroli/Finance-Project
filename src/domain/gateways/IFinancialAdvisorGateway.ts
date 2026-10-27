/**
 * src/domain/gateways/IFinancialAdvisorGateway.ts
 *
 * Camada: Domínio — Porta (Interface) para o Assistente Financeiro de IA.
 *
 * REGRA ABSOLUTA: Interface pura — sem import de SDKs externos (Supabase, Gemini, Expo).
 * Permite trocar entre Supabase Edge Function (Gemini), API direta ou motor offline
 * sem alterar os casos de uso ou entidades.
 */

import type { ProximoGastoFixo } from "../services/AlertasGastosFixos";

export type AdvisorSource = "supabase-gemini" | "local-engine";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  source?: AdvisorSource;
}

export interface CategoriaResumoContexto {
  categoria: string;
  total: number;
  percentual: number;
}

export interface CaixinhaResumoContexto {
  id: string;
  title: string;
  currentAmount: number;
  targetAmount: number;
  percentualConcluido: number;
}

export interface TransacaoResumoContexto {
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  isFixed: boolean;
  isForecast: boolean;
  date: string;
}

/**
 * Snapshot enxuto (~300 a 500 tokens em JSON) com todos os dados financeiros
 * do usuário extraídos do SQLite local para contextualizar a IA.
 */
export interface FinancialContextSnapshot {
  mesReferencia: string;
  totalReceitas: number;
  totalDespesasFixas: number;
  totalDespesasVariaveis: number;
  totalDespesas: number;
  saldoLivre: number;
  sugestaoPoupar20: number;
  sugestaoGastar80: number;
  despesasPorCategoria: CategoriaResumoContexto[];
  caixinhas: CaixinhaResumoContexto[];
  proximosGastosFixos: ProximoGastoFixo[];
  transacoesRecentes: TransacaoResumoContexto[];
}

export interface AdvisorResponse {
  resposta: string;
  source: AdvisorSource;
}

export interface IFinancialAdvisorGateway {
  /**
   * Envia a pergunta do usuário junto com o histórico recente e o snapshot
   * dos dados financeiros locais para o consultor de IA.
   */
  enviarMensagem(
    historico: ChatMessage[],
    pergunta: string,
    contexto: FinancialContextSnapshot
  ): Promise<AdvisorResponse>;
}
