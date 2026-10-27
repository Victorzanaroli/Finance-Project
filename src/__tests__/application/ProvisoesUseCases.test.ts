/**
 * src/__tests__/application/ProvisoesUseCases.test.ts
 *
 * Testes do AlertasGastosFixos (cálculo de vencimentos de contas fixas e quinto dia útil).
 */

import { calcularProximosGastosFixos } from "../../domain/services/AlertasGastosFixos";
import { Transaction } from "../../domain/entities/Transaction";

describe("AlertasGastosFixos — Próximos Gastos Fixos", () => {
  it("calcula corretamente o vencimento no mês atual e na virada de mês", () => {
    const aluguel = Transaction.criar({
      id: "fix-1",
      title: "Aluguel",
      amount: 1200,
      type: "expense",
      category: "Casa",
      isFixed: true,
      recurrenceDay: "15",
      date: "2026-10-01",
    });

    const internet = Transaction.criar({
      id: "fix-2",
      title: "Internet",
      amount: 100,
      type: "expense",
      category: "Casa",
      isFixed: true,
      recurrenceDay: "5",
      date: "2026-10-01",
    });

    // Data base: 10 de Outubro de 2026
    const lista = calcularProximosGastosFixos([aluguel, internet], new Date(2026, 9, 10), 31);

    expect(lista).toHaveLength(2);
    // Aluguel vence em 5 dias (15/10), Internet já passou dia 5 e vence em Novembro (05/11)
    expect(lista[0].title).toBe("Aluguel");
    expect(lista[0].diasRestantes).toBe(5);
    expect(lista[1].title).toBe("Internet");
    expect(lista[1].dataVencimentoISO).toBe("2026-11-05");
  });
});
