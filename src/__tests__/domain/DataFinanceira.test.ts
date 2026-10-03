/**
 * Testes do Value Object DataFinanceira.
 *
 * Regressão importante: "hoje" deve respeitar o fuso LOCAL (o app roda no
 * Brasil, UTC-3). Usar toISOString() virava o dia após as 21h.
 */

import {
  dataISOValida,
  hojeISO,
  mesISO,
  mesReferenciaValido,
} from "../../domain/value-objects/DataFinanceira";

describe("DataFinanceira", () => {
  describe("dataISOValida()", () => {
    it("aceita datas reais, inclusive 29/02 em ano bissexto", () => {
      expect(dataISOValida("2024-01-31")).toBe(true);
      expect(dataISOValida("2024-02-29")).toBe(true);
    });

    it("rejeita formato errado, datas inexistentes e valores vazios", () => {
      expect(dataISOValida("01/01/2024")).toBe(false);
      expect(dataISOValida("2024-1-1")).toBe(false);
      expect(dataISOValida("2025-02-29")).toBe(false);
      expect(dataISOValida("2024-13-01")).toBe(false);
      expect(dataISOValida("2024-04-31")).toBe(false);
      expect(dataISOValida("2024-00-10")).toBe(false);
      expect(dataISOValida("")).toBe(false);
    });
  });

  describe("hojeISO() / mesISO()", () => {
    it("usa os componentes LOCAIS da data (23h30 do dia 31/12 continua dia 31/12)", () => {
      const agora = new Date(2025, 11, 31, 23, 30, 0); // local
      expect(hojeISO(agora)).toBe("2025-12-31");
      expect(mesISO(agora)).toBe("2025-12");
    });

    it("preenche mês e dia com zero à esquerda", () => {
      const agora = new Date(2026, 0, 5, 8, 0, 0);
      expect(hojeISO(agora)).toBe("2026-01-05");
      expect(mesISO(agora)).toBe("2026-01");
    });

    it("usa a data atual quando nenhum argumento é informado", () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
      expect(hojeISO()).toBe("2026-06-15");
      expect(mesISO()).toBe("2026-06");
      jest.useRealTimers();
    });
  });

  describe("mesReferenciaValido()", () => {
    it("valida o formato YYYY-MM", () => {
      expect(mesReferenciaValido("2025-01")).toBe(true);
      expect(mesReferenciaValido("2025-12")).toBe(true);
      expect(mesReferenciaValido("2025-13")).toBe(false);
      expect(mesReferenciaValido("2025-00")).toBe(false);
      expect(mesReferenciaValido("25-01")).toBe(false);
      expect(mesReferenciaValido("2025-1")).toBe(false);
    });
  });
});
