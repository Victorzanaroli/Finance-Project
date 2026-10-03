/**
 * src/domain/services/CalculadoraUber.ts
 *
 * Camada: Domínio — Domain Service (regra de negócio pura).
 *
 * Regras:
 *  - Período Uber: dia 09 do mês de referência → dia 08 do mês seguinte.
 *  - Dias de trabalho: Dom, Seg, Qui, Sex, Sáb (folga Terça e Quarta).
 *  - Deduções: APENAS gasolina (semanas do período × R$140) e óleo (R$50 fixo).
 */

import { validarMes } from "../value-objects/Meses";

/** Dom=0, Seg=1, Qui=4, Sex=5, Sáb=6 (folga Terça=2 e Quarta=3). */
export const DIAS_TRABALHO_UBER: readonly number[] = [0, 1, 4, 5, 6];

export const FATURAMENTO_DIARIO = 100;
export const CUSTO_GASOLINA_SEMANA = 140;
export const CUSTO_OLEO_MES = 50;

export interface ResultadoUber {
  /** ISO "YYYY-MM-DD" (dia 09 do mês de referência). */
  dataInicio: string;
  /** ISO "YYYY-MM-DD" (dia 08 do mês seguinte). */
  dataFim: string;
  diasTrabalhados: number;
  semanasNoPeriodo: number;
  faturamentoBruto: number;
  custoGasolina: number;
  custoOleo: number;
  totalDeducoes: number;
  lucroLiquido: number;
}

const pad = (n: number): string => String(n).padStart(2, "0");

export function calcularUber(mes: number, ano: number): ResultadoUber {
  validarMes(mes);
  if (!Number.isInteger(ano) || ano < 1) {
    throw new Error("ano inválido.");
  }

  const inicio = new Date(ano, mes - 1, 9);
  const mesSeguinte = mes === 12 ? 1 : mes + 1;
  const anoSeguinte = mes === 12 ? ano + 1 : ano;
  const fim = new Date(anoSeguinte, mesSeguinte - 1, 8);

  let diasTrabalhados = 0;
  let totalDiasPeriodo = 0;
  const cursor = new Date(inicio);

  while (cursor <= fim) {
    totalDiasPeriodo++;
    if (DIAS_TRABALHO_UBER.includes(cursor.getDay())) {
      diasTrabalhados++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const semanasNoPeriodo = totalDiasPeriodo / 7;
  const faturamentoBruto = diasTrabalhados * FATURAMENTO_DIARIO;
  const custoGasolina = Math.round(semanasNoPeriodo * CUSTO_GASOLINA_SEMANA);
  const custoOleo = CUSTO_OLEO_MES;
  const totalDeducoes = custoGasolina + custoOleo;

  return {
    dataInicio: `${ano}-${pad(mes)}-09`,
    dataFim: `${anoSeguinte}-${pad(mesSeguinte)}-08`,
    diasTrabalhados,
    semanasNoPeriodo,
    faturamentoBruto,
    custoGasolina,
    custoOleo,
    totalDeducoes,
    lucroLiquido: faturamentoBruto - totalDeducoes,
  };
}
