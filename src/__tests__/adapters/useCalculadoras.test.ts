/**
 * src/__tests__/adapters/useCalculadoras.test.ts
 *
 * Testes das funções de cálculo puro do módulo calculos.ts.
 *
 * Nível 1-2 da pirâmide TDD (SKILL.md §10):
 *   - calcularTransporte() e calcularDiasUteis() são funções puras —
 *     testadas sem mocks, sem hooks, sem componentes React, sem SQLite.
 *   - Importam de src/adapters/calculadoras/calculos.ts (módulo isolado)
 *     e NÃO de useCalculadoras.ts (que transitivamente acessa expo-sqlite
 *     via composition-root → não testável em Jest puro).
 *
 * Rastreabilidade: RF "Calculadora Transporte" e "Calculadora Universitária"
 */

import {
  calcularTransporte,
  calcularDiasUteis,
  DEDUCOES_TRANSPORTE,
  CUSTO_REFEICAO_DIARIO,
} from "../../adapters/calculadoras/calculos";

// ─────────────────────────────────────────────────────────────────────────────
// calcularTransporte()
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularTransporte()", () => {
  const DEDUCOES_FIXAS = 610; // 560 + 50

  it("deve calcular faturamento bruto corretamente (default: R$100 × 5 dias × 4 sem)", () => {
    const { faturamentoBruto } = calcularTransporte(100, 5);
    expect(faturamentoBruto).toBe(2000); // 100 × 5 × 4
  });

  it("deve calcular lucro líquido subtraindo as deduções fixas de R$610", () => {
    const { lucroLiquido, deducoes } = calcularTransporte(100, 5);
    expect(deducoes).toBe(DEDUCOES_FIXAS);
    expect(lucroLiquido).toBe(2000 - DEDUCOES_FIXAS); // R$1.390
  });

  it("deve retornar lucro negativo quando meta é insuficiente para cobrir deduções", () => {
    // R$50/dia × 3 dias × 4 sem = R$600 < R$610 de deduções
    const { lucroLiquido } = calcularTransporte(50, 3);
    expect(lucroLiquido).toBeLessThan(0);
  });

  it("deve escalar corretamente com diferentes combinações de meta e dias", () => {
    const { faturamentoBruto } = calcularTransporte(150, 6);
    expect(faturamentoBruto).toBe(3600); // 150 × 6 × 4

    const { faturamentoBruto: b2 } = calcularTransporte(200, 7);
    expect(b2).toBe(5600); // 200 × 7 × 4
  });

  it("DEDUCOES_TRANSPORTE.total deve ser exatamente R$610", () => {
    expect(DEDUCOES_TRANSPORTE.total).toBe(610);
    expect(DEDUCOES_TRANSPORTE.gasolina).toBe(560);
    expect(DEDUCOES_TRANSPORTE.oleo).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcularDiasUteis()
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularDiasUteis()", () => {
  it("Janeiro 2025 deve ter 23 dias úteis", () => {
    // Jan 2025: começa Qua, 31 dias → 23 dias úteis (verificado manualmente)
    expect(calcularDiasUteis(1, 2025)).toBe(23);
  });

  it("Fevereiro 2025 deve ter 20 dias úteis", () => {
    // Fev 2025: 28 dias (não bissexto), começa Sab → 20 dias úteis
    expect(calcularDiasUteis(2, 2025)).toBe(20);
  });

  it("Fevereiro 2024 (bissexto) deve ter 21 dias úteis", () => {
    // Fev 2024: 29 dias (bissexto), começa Qui → 21 dias úteis
    expect(calcularDiasUteis(2, 2024)).toBe(21);
  });

  it("deve retornar valor entre 20 e 23 para qualquer mês padrão", () => {
    for (let mes = 1; mes <= 12; mes++) {
      const dias = calcularDiasUteis(mes, 2025);
      expect(dias).toBeGreaterThanOrEqual(20);
      expect(dias).toBeLessThanOrEqual(23);
    }
  });

  it("custo total de refeições deve ser dias_úteis × R$7,80", () => {
    const dias = calcularDiasUteis(1, 2025); // 23 dias
    const total = dias * CUSTO_REFEICAO_DIARIO;
    expect(total).toBeCloseTo(23 * 7.8, 2);
    expect(total).toBeCloseTo(179.4, 1);
  });

  it("CUSTO_REFEICAO_DIARIO deve ser R$7,80", () => {
    expect(CUSTO_REFEICAO_DIARIO).toBe(7.8);
  });
});
