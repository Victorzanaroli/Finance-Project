/**
 * src/__tests__/application/EscanearFaturaUseCase.test.ts
 *
 * Testes do motor local de IA financeira (custo zero) — GeminiSupabaseAdvisorGateway.
 */

import {
  GeminiSupabaseAdvisorGateway,
  simularProjecaoTrabalhoOuGanhos,
} from "../../adapters/gateways/ai/GeminiSupabaseAdvisorGateway";
import type { FinancialContextSnapshot } from "../../domain/gateways/IFinancialAdvisorGateway";

const snapshotMock: FinancialContextSnapshot = {
  mesReferencia: "2026-10",
  totalReceitas: 4000,
  totalDespesasFixas: 1200,
  totalDespesasVariaveis: 800,
  totalDespesas: 2000,
  saldoLivre: 2000,
  sugestaoPoupar20: 400,
  sugestaoGastar80: 1600,
  despesasPorCategoria: [{ categoria: "Casa", total: 1200, percentual: 60 }],
  caixinhas: [{ id: "g1", title: "Poupança", currentAmount: 200, targetAmount: 1000, percentualConcluido: 20 }],
  proximosGastosFixos: [],
  transacoesRecentes: [],
};

describe("GeminiSupabaseAdvisorGateway (Motor Local Custo Zero)", () => {
  it("responde localmente com source 'local-engine' e custo zero", async () => {
    const gateway = new GeminiSupabaseAdvisorGateway();
    const res = await gateway.enviarMensagem([], "Quanto devo guardar ou investir?", snapshotMock);

    expect(res.source).toBe("local-engine");
    expect(res.resposta).toContain("Plano de Investimento & Reserva");
  });

  it("simula viabilidade de compra com base no saldo livre", async () => {
    const gateway = new GeminiSupabaseAdvisorGateway();
    const res = await gateway.enviarMensagem([], "Posso comprar algo de R$ 350?", snapshotMock);

    expect(res.source).toBe("local-engine");
    expect(res.resposta).toContain("Plano Viável!");
  });

  it("calcula exatamente a simulação de Uber com dias da semana excluídos, data final e combustível", () => {
    const perguntaUber =
      "Quero saber se eu fazendo Uber, eu tiro R$ 100 por dia aproximadamente. Se eu rodar todos os dias, tirando terça e quarta, até o dia 9 de novembro, quanto eu teria tirado a partir de hoje? Lembrando que eu abasteço duas vezes na semana e cada abastecimento é em média R$ 70";

    const resposta = simularProjecaoTrabalhoOuGanhos(
      perguntaUber,
      snapshotMock,
      new Date(2026, 9, 25) // 25/10/2026 (Domingo) até 09/11/2026 (Segunda) = 16 dias corridos, 12 dias trabalhados
    );

    expect(resposta).not.toBeNull();
    expect(resposta).toContain("Simulação Exata dos seus Ganhos");
    expect(resposta).toContain("Terça e Quarta");
    expect(resposta).toContain("12 dias");
    expect(resposta).toContain("R$\u00a01.200,00"); // 12 * 100
    expect(resposta).toContain("Custos de Abastecimento");
  });
});
