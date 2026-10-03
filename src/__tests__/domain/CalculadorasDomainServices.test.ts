/**
 * Testes dos Domain Services de cálculo financeiro.
 *
 * Antes essas regras de negócio viviam em `adapters/calculadoras/calculos.ts`
 * (e a regra 80/20 dentro de um componente visual). Foram movidas para o
 * domínio, onde são puras e testáveis sem nenhum framework.
 *
 * Valores de referência conferidos manualmente no calendário:
 *  - Jan/2025: 09/01 (qui) → 08/02 = 31 dias, 23 dias de trabalho (exclui ter/qua)
 *  - Fev/2025: 09/02 (dom) → 08/03 = 28 dias, 20 dias de trabalho
 *  - Dez/2025: 09/12 (ter) → 08/01/2026 = 31 dias, 21 dias de trabalho (vira o ano)
 */

import {
  CUSTO_GASOLINA_SEMANA,
  CUSTO_OLEO_MES,
  DIAS_TRABALHO_UBER,
  FATURAMENTO_DIARIO,
  calcularUber,
} from "../../domain/services/CalculadoraUber";
import {
  CUSTO_REFEICAO_DIARIO,
  calcularCustoRefeitorio,
  calcularDiasUteis,
} from "../../domain/services/CalculadoraRefeitorio";
import {
  PERCENTUAL_GUARDAR,
  PERCENTUAL_LAZER,
  distribuirSaldoLivre,
} from "../../domain/services/DistribuicaoSaldo";
import { MESES_NOMES, nomeDoMes } from "../../domain/value-objects/Meses";

describe("CalculadoraUber", () => {
  it("expõe as constantes de negócio", () => {
    expect(DIAS_TRABALHO_UBER).toEqual([0, 1, 4, 5, 6]);
    expect(FATURAMENTO_DIARIO).toBe(100);
    expect(CUSTO_GASOLINA_SEMANA).toBe(140);
    expect(CUSTO_OLEO_MES).toBe(50);
  });

  it("Jan/2025: período 09/01→08/02, 23 dias, lucro R$1.630", () => {
    const r = calcularUber(1, 2025);
    expect(r.dataInicio).toBe("2025-01-09");
    expect(r.dataFim).toBe("2025-02-08");
    expect(r.diasTrabalhados).toBe(23);
    expect(r.semanasNoPeriodo).toBeCloseTo(31 / 7, 10);
    expect(r.faturamentoBruto).toBe(2300);
    expect(r.custoGasolina).toBe(620);
    expect(r.custoOleo).toBe(50);
    expect(r.totalDeducoes).toBe(670);
    expect(r.lucroLiquido).toBe(1630);
  });

  it("Fev/2025: período de exatamente 4 semanas, lucro R$1.390", () => {
    const r = calcularUber(2, 2025);
    expect(r.dataInicio).toBe("2025-02-09");
    expect(r.dataFim).toBe("2025-03-08");
    expect(r.diasTrabalhados).toBe(20);
    expect(r.semanasNoPeriodo).toBe(4);
    expect(r.custoGasolina).toBe(560);
    expect(r.lucroLiquido).toBe(1390);
  });

  it("Dez/2025: período cruza a virada do ano (09/12/2025 → 08/01/2026)", () => {
    const r = calcularUber(12, 2025);
    expect(r.dataInicio).toBe("2025-12-09");
    expect(r.dataFim).toBe("2026-01-08");
    expect(r.diasTrabalhados).toBe(21);
    expect(r.lucroLiquido).toBe(2100 - 620 - 50);
  });

  it("não deduz os R$150 de manutenção da moto (apenas gasolina + óleo)", () => {
    const r = calcularUber(2, 2025);
    expect(r.totalDeducoes).toBe(r.custoGasolina + r.custoOleo);
  });

  it.each([0, 13, 1.5, NaN])("rejeita mês inválido (%s)", (mes) => {
    expect(() => calcularUber(mes, 2025)).toThrow("mês deve ser um inteiro entre 1 e 12");
  });

  it("rejeita ano inválido", () => {
    expect(() => calcularUber(1, 20.5)).toThrow("ano inválido");
  });
});

describe("CalculadoraRefeitorio", () => {
  it.each([
    [1, 2025, 23],
    [2, 2025, 20],
    [2, 2024, 21],
  ])("calcularDiasUteis(%s/%s) = %s", (mes, ano, esperado) => {
    expect(calcularDiasUteis(mes, ano)).toBe(esperado);
  });

  it("qualquer mês de 2025 tem entre 20 e 23 dias úteis", () => {
    for (let mes = 1; mes <= 12; mes++) {
      const dias = calcularDiasUteis(mes, 2025);
      expect(dias).toBeGreaterThanOrEqual(20);
      expect(dias).toBeLessThanOrEqual(23);
    }
  });

  it("calcularCustoRefeitorio = dias úteis × R$7,80 arredondado em centavos", () => {
    expect(CUSTO_REFEICAO_DIARIO).toBe(7.8);
    expect(calcularCustoRefeitorio(1, 2025)).toBe(179.4);
    expect(calcularCustoRefeitorio(2, 2025)).toBe(156);
  });

  it.each([0, 13])("rejeita mês inválido (%s)", (mes) => {
    expect(() => calcularDiasUteis(mes, 2025)).toThrow("mês deve ser um inteiro entre 1 e 12");
  });
});

describe("DistribuicaoSaldo", () => {
  it("divide o saldo positivo em 80% guardar / 20% lazer", () => {
    expect(PERCENTUAL_GUARDAR).toBe(0.8);
    expect(PERCENTUAL_LAZER).toBe(0.2);
    const d = distribuirSaldoLivre(1000);
    expect(d).toEqual({ guardar: 800, lazer: 200, negativo: false });
  });

  it("saldo zero ou negativo não gera sugestão", () => {
    expect(distribuirSaldoLivre(0)).toEqual({ guardar: 0, lazer: 0, negativo: true });
    expect(distribuirSaldoLivre(-50)).toEqual({ guardar: 0, lazer: 0, negativo: true });
  });
});

describe("Meses", () => {
  it("nomeDoMes retorna o nome em português (1-12)", () => {
    expect(MESES_NOMES).toHaveLength(12);
    expect(nomeDoMes(1)).toBe("Janeiro");
    expect(nomeDoMes(3)).toBe("Março");
    expect(nomeDoMes(12)).toBe("Dezembro");
  });

  it("nomeDoMes rejeita mês fora do intervalo", () => {
    expect(() => nomeDoMes(0)).toThrow("mês deve ser um inteiro entre 1 e 12");
    expect(() => nomeDoMes(13)).toThrow("mês deve ser um inteiro entre 1 e 12");
  });
});
