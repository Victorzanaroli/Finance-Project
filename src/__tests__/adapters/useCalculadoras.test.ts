/**
 * src/__tests__/adapters/useCalculadoras.test.ts
 *
 * Testes das funções puras do módulo src/adapters/calculadoras/calculos.ts.
 */

import {
  calcularProvisaoPeriodo,
  formatCurrency,
  formatarData,
} from "../../adapters/calculadoras/calculos";

describe("calcularProvisaoPeriodo()", () => {
  it("calcula dias trabalhados, faturamento bruto, deduções e líquido em um período", () => {
    const resultado = calcularProvisaoPeriodo({
      dataInicial: new Date(2026, 9, 1), // Outubro 2026
      dataFinal: new Date(2026, 9, 31),
      diasAtivos: [1, 2, 3, 4, 5], // Segunda a Sexta (22 dias úteis em Outubro/2026)
      valorPorDia: 100,
      deducaoFrequente: 50,
      vezesPorSemana: 1,
    });

    expect(resultado.diasTotais).toBe(31);
    expect(resultado.diasCalculados).toBe(22);
    expect(resultado.faturamentoBruto).toBe(2200);
    expect(resultado.deducoes).toBeGreaterThan(0);
    expect(resultado.resultadoLiquido).toBeCloseTo(
      resultado.faturamentoBruto - resultado.deducoes,
      2
    );
  });

  it("formata moeda e datas corretamente", () => {
    expect(formatCurrency(1500)).toContain("1.500,00");
    expect(formatarData("2026-10-25")).toBe("25/10/2026");
  });
});
