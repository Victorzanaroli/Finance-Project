/**
 * src/application/use-cases/ConsultarAssistenteFinanceiroUseCase.ts
 *
 * Camada: Aplicação — Caso de Uso "Consultar Assistente Financeiro (IA)".
 *
 * Responsabilidade:
 *  1. Coletar todos os dados financeiros relevantes do usuário no SQLite local
 *     (transações do mês, gastos fixos, categorias, caixinhas/metas, saldo livre).
 *  2. Construir um FinancialContextSnapshot enxuto (otimizado para gastar o mínimo
 *     de tokens possível na chamada à IA).
 *  3. Enviar a pergunta + histórico + snapshot ao IFinancialAdvisorGateway.
 *
 * REGRA ABSOLUTA: Sem imports de infraestrutura (Supabase, Gemini, SQLite).
 */

import type {
  AdvisorResponse,
  ChatMessage,
  FinancialContextSnapshot,
  IFinancialAdvisorGateway,
} from "../../domain/gateways/IFinancialAdvisorGateway";
import type { IGoalRepository } from "../../domain/repositories/IGoalRepository";
import type { ITransactionRepository } from "../../domain/repositories/ITransactionRepository";
import { calcularProximosGastosFixos } from "../../domain/services/AlertasGastosFixos";
import { mesISO } from "../../domain/value-objects/DataFinanceira";

const arredondar = (valor: number): number => Math.round(valor * 100) / 100;

export class ConsultarAssistenteFinanceiroUseCase {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly goalRepository: IGoalRepository,
    private readonly advisorGateway: IFinancialAdvisorGateway
  ) {}

  /**
   * Monta o contexto financeiro completo e enxuto a partir dos repositórios locais.
   */
  async montarContexto(dataAtual: Date = new Date()): Promise<FinancialContextSnapshot> {
    const mesReferencia = mesISO(dataAtual);

    const [transacoesMes, transacoesFixas, caixinhas] = await Promise.all([
      this.transactionRepository.buscarTodas({ month: mesReferencia }),
      this.transactionRepository.buscarTodas({ isFixed: true }),
      this.goalRepository.buscarTodas(),
    ]);

    let totalReceitas = 0;
    let totalDespesasFixas = 0;
    let totalDespesasVariaveis = 0;
    const porCategoria = new Map<string, number>();

    for (const tx of transacoesMes) {
      if (tx.isForecast) {
        continue;
      }
      if (tx.type === "income") {
        totalReceitas += tx.amount;
        continue;
      }
      if (tx.isFixed) {
        totalDespesasFixas += tx.amount;
      } else {
        totalDespesasVariaveis += tx.amount;
      }
      porCategoria.set(tx.category, (porCategoria.get(tx.category) ?? 0) + tx.amount);
    }

    totalReceitas = arredondar(totalReceitas);
    totalDespesasFixas = arredondar(totalDespesasFixas);
    totalDespesasVariaveis = arredondar(totalDespesasVariaveis);
    const totalDespesas = arredondar(totalDespesasFixas + totalDespesasVariaveis);
    const saldoLivre = arredondar(totalReceitas - totalDespesas);

    const sugestaoPoupar20 = saldoLivre > 0 ? arredondar(saldoLivre * 0.2) : 0;
    const sugestaoGastar80 = saldoLivre > 0 ? arredondar(saldoLivre * 0.8) : 0;

    const despesasPorCategoria = [...porCategoria.entries()]
      .map(([categoria, total]) => ({
        categoria,
        total: arredondar(total),
        percentual: totalDespesas > 0 ? Math.round((total / totalDespesas) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const proximosGastosFixos = calcularProximosGastosFixos(transacoesFixas, dataAtual, 31);

    const caixinhasResumo = caixinhas.map((g) => ({
      id: g.id,
      title: g.title,
      currentAmount: g.currentAmount,
      targetAmount: g.targetAmount,
      percentualConcluido: g.percentualConcluido,
    }));

    const transacoesRecentes = [...transacoesMes]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 12)
      .map((t) => ({
        title: t.title,
        amount: t.amount,
        type: t.type,
        category: t.category,
        isFixed: t.isFixed,
        isForecast: t.isForecast,
        date: t.date,
      }));

    return {
      mesReferencia,
      totalReceitas,
      totalDespesasFixas,
      totalDespesasVariaveis,
      totalDespesas,
      saldoLivre,
      sugestaoPoupar20,
      sugestaoGastar80,
      despesasPorCategoria,
      caixinhas: caixinhasResumo,
      proximosGastosFixos,
      transacoesRecentes,
    };
  }

  /**
   * Executa uma consulta ao assistente financeiro com base nos dados reais do SQLite.
   */
  async perguntar(
    pergunta: string,
    historico: ChatMessage[] = [],
    dataAtual: Date = new Date()
  ): Promise<{ resposta: string; source: AdvisorResponse["source"]; contexto: FinancialContextSnapshot }> {
    const perguntaLimpa = pergunta.trim();
    if (!perguntaLimpa) {
      throw new Error("ConsultarAssistenteFinanceiroUseCase: a pergunta não pode ser vazia.");
    }

    const contexto = await this.montarContexto(dataAtual);
    // Limita o histórico às últimas 6 mensagens para economizar tokens
    const historicoRecente = historico.slice(-6);

    const resultado = await this.advisorGateway.enviarMensagem(
      historicoRecente,
      perguntaLimpa,
      contexto
    );

    return {
      resposta: resultado.resposta,
      source: resultado.source,
      contexto,
    };
  }
}
