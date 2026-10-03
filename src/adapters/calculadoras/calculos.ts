/**
 * src/adapters/calculadoras/calculos.ts
 *
 * Camada: Adapters — Funções de cálculo PURAS das Calculadoras.
 *
 * Módulo Genérico de Cálculos Inteligentes
 */

export interface ParametrosProvisao {
  dataInicial: Date;
  dataFinal: Date;
  apenasDiasUteis: boolean;
  valorPorDia: number;
  deducoesFixas: number;
}

export interface ResultadoProvisao {
  diasTotais: number;
  diasCalculados: number; // quantos dias entraram na conta (ex: só dias úteis)
  faturamentoBruto: number;
  deducoes: number;
  resultadoLiquido: number;
}

/**
 * Calcula a provisão de um período genérico.
 */
export function calcularProvisaoPeriodo(params: ParametrosProvisao): ResultadoProvisao {
  const { dataInicial, dataFinal, apenasDiasUteis, valorPorDia, deducoesFixas } = params;

  // Garantir que as datas não têm horas para não dar problema no getTime
  const inicio = new Date(dataInicial.getFullYear(), dataInicial.getMonth(), dataInicial.getDate());
  const fim = new Date(dataFinal.getFullYear(), dataFinal.getMonth(), dataFinal.getDate());

  let diasTotais = 0;
  let diasCalculados = 0;
  const cursor = new Date(inicio);

  while (cursor <= fim) {
    diasTotais++;
    const diaSemana = cursor.getDay();
    const isFimDeSemana = diaSemana === 0 || diaSemana === 6;

    if (!apenasDiasUteis || !isFimDeSemana) {
      diasCalculados++;
    }
    
    cursor.setDate(cursor.getDate() + 1);
  }

  const faturamentoBruto = diasCalculados * valorPorDia;
  const deducoes = deducoesFixas;
  const resultadoLiquido = faturamentoBruto - deducoes;

  return {
    diasTotais,
    diasCalculados,
    faturamentoBruto,
    deducoes,
    resultadoLiquido,
  };
}

// Helpers de Formatação
export const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function formatarData(isoDate: string | Date): string {
  if (isoDate instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(isoDate.getDate())}/${pad(isoDate.getMonth() + 1)}/${isoDate.getFullYear()}`;
  }
  const parts = isoDate.split("T")[0].split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}
