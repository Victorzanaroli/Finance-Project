/**
 * src/domain/services/CalculadoraRefeitorio.ts
 *
 * Camada: Domínio — Domain Service. Previsão de gasto com refeitório
 * universitário: dias úteis (Seg–Sex) × custo diário.
 */

import { validarMes } from "../value-objects/Meses";

export const CUSTO_REFEICAO_DIARIO = 7.8;

/** Dias úteis (Seg–Sex) do mês. `mes` é 1-12. */
export function calcularDiasUteis(mes: number, ano: number): number {
  validarMes(mes);

  const totalDias = new Date(ano, mes, 0).getDate();
  let diasUteis = 0;

  for (let dia = 1; dia <= totalDias; dia++) {
    const diaSemana = new Date(ano, mes - 1, dia).getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasUteis++;
    }
  }

  return diasUteis;
}

/** Custo total de refeições do mês, arredondado em centavos. */
export function calcularCustoRefeitorio(mes: number, ano: number): number {
  return Math.round(calcularDiasUteis(mes, ano) * CUSTO_REFEICAO_DIARIO * 100) / 100;
}
