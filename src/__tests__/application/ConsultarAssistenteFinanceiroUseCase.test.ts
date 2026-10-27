/**
 * src/__tests__/application/ConsultarAssistenteFinanceiroUseCase.test.ts
 *
 * Testes unitários do ConsultarAssistenteFinanceiroUseCase e AlertasGastosFixos.
 */

import { ConsultarAssistenteFinanceiroUseCase } from "../../application/use-cases/ConsultarAssistenteFinanceiroUseCase";
import { Goal } from "../../domain/entities/Goal";
import { Transaction } from "../../domain/entities/Transaction";
import type {
  AdvisorResponse,
  ChatMessage,
  FinancialContextSnapshot,
  IFinancialAdvisorGateway,
} from "../../domain/gateways/IFinancialAdvisorGateway";
import { calcularProximosGastosFixos } from "../../domain/services/AlertasGastosFixos";
import { gerarRespostaLocalInteligente } from "../../adapters/gateways/ai/GeminiSupabaseAdvisorGateway";
import { InMemoryGoalRepository, InMemoryTransactionRepository } from "../helpers/fakes";

class FakeFinancialAdvisorGateway implements IFinancialAdvisorGateway {
  public ultimoContexto: FinancialContextSnapshot | null = null;
  public ultimaPergunta = "";

  async enviarMensagem(
    _historico: ChatMessage[],
    pergunta: string,
    contexto: FinancialContextSnapshot
  ): Promise<AdvisorResponse> {
    this.ultimaPergunta = pergunta;
    this.ultimoContexto = contexto;
    return {
      resposta: gerarRespostaLocalInteligente(pergunta, contexto),
      source: "local-engine",
    };
  }
}

describe("ConsultarAssistenteFinanceiroUseCase & AlertasGastosFixos", () => {
  let txRepo: InMemoryTransactionRepository;
  let goalRepo: InMemoryGoalRepository;
  let advisorGateway: FakeFinancialAdvisorGateway;
  let useCase: ConsultarAssistenteFinanceiroUseCase;

  beforeEach(() => {
    txRepo = new InMemoryTransactionRepository();
    goalRepo = new InMemoryGoalRepository();
    advisorGateway = new FakeFinancialAdvisorGateway();
    useCase = new ConsultarAssistenteFinanceiroUseCase(txRepo, goalRepo, advisorGateway);
  });

  it("monta o snapshot financeiro com receitas, gastos fixos, caixinhas e próximos vencimentos", async () => {
    const dataRef = new Date(2026, 9, 10); // 10/10/2026

    await txRepo.salvar(
      Transaction.criar({
        id: "tx-1",
        title: "Salário Mensal",
        amount: 4500,
        type: "income",
        category: "Salário",
        isFixed: true,
        recurrenceDay: "quinto_dia_util",
        date: "2026-10-07",
      })
    );

    await txRepo.salvar(
      Transaction.criar({
        id: "tx-2",
        title: "Aluguel",
        amount: 1200,
        type: "expense",
        category: "Casa",
        isFixed: true,
        recurrenceDay: "12",
        date: "2026-10-12",
      })
    );

    await txRepo.salvar(
      Transaction.criar({
        id: "tx-3",
        title: "Supermercado",
        amount: 500,
        type: "expense",
        category: "Alimentação",
        isFixed: false,
        date: "2026-10-08",
      })
    );

    await goalRepo.salvar(
      Goal.criar({
        id: "g-1",
        title: "Reserva de Emergência",
        targetAmount: 5000,
        currentAmount: 1500,
        colorHex: "#06b6d4",
      })
    );

    const ctx = await useCase.montarContexto(dataRef);

    expect(ctx.mesReferencia).toBe("2026-10");
    expect(ctx.totalReceitas).toBe(4500);
    expect(ctx.totalDespesasFixas).toBe(1200);
    expect(ctx.totalDespesasVariaveis).toBe(500);
    expect(ctx.totalDespesas).toBe(1700);
    expect(ctx.saldoLivre).toBe(2800);
    expect(ctx.sugestaoPoupar20).toBe(560);
    expect(ctx.sugestaoGastar80).toBe(2240);
    expect(ctx.caixinhas).toHaveLength(1);
    expect(ctx.caixinhas[0].percentualConcluido).toBe(30);

    // Aluguel vence dia 12/10 e a dataRef é 10/10 -> faltam 2 dias
    const aluguelFixo = ctx.proximosGastosFixos.find((f) => f.title === "Aluguel");
    expect(aluguelFixo).toBeDefined();
    expect(aluguelFixo?.diasRestantes).toBe(2);
    expect(aluguelFixo?.urgencia).toBe("proximo");
  });

  it("responde dúvidas sobre investimento e simulação de compra com os dados reais do SQLite", async () => {
    const dataRef = new Date(2026, 9, 10);

    await txRepo.salvar(
      Transaction.criar({
        id: "tx-1",
        title: "Salário",
        amount: 3000,
        type: "income",
        category: "Salário",
        isFixed: false,
        date: "2026-10-05",
      })
    );

    await txRepo.salvar(
      Transaction.criar({
        id: "tx-2",
        title: "Internet Fibra",
        amount: 120,
        type: "expense",
        category: "Casa",
        isFixed: true,
        recurrenceDay: "15",
        date: "2026-10-15",
      })
    );

    const respInvestir = await useCase.perguntar(
      "Quanto devo guardar ou investir neste mês?",
      [],
      dataRef
    );
    expect(respInvestir.resposta).toContain("Plano de Investimento & Reserva");
    expect(respInvestir.contexto.saldoLivre).toBe(2880);

    const respSimulacao = await useCase.perguntar(
      "Posso fazer uma compra de R$ 400?",
      [],
      dataRef
    );
    expect(respSimulacao.resposta).toContain("Plano Viável!");
  });

  it("calcula corretamente o vencimento no próximo mês quando o dia já passou no mês atual", () => {
    const dataRef = new Date(2026, 9, 20); // 20/10/2026
    const txFixa = Transaction.criar({
      id: "fix-1",
      title: "Academia",
      amount: 110,
      type: "expense",
      category: "Saúde",
      isFixed: true,
      recurrenceDay: "10",
      date: "2026-10-10",
    });

    const alertas = calcularProximosGastosFixos([txFixa], dataRef, 31);
    expect(alertas).toHaveLength(1);
    expect(alertas[0].dataVencimentoISO).toBe("2026-11-10");
    expect(alertas[0].diasRestantes).toBe(21);
  });
});
