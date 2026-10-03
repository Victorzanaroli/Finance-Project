/**
 * src/adapters/calculadoras/calculos.ts
 *
 * Módulo Genérico de Cálculos Inteligentes
 */

export interface ParametrosProvisao {
  dataInicial: Date;
  dataFinal: Date;
  diasAtivos: number[]; // Array de inteiros (0=Dom, 1=Seg, ..., 6=Sab) marcados como trabalhados
  valorPorDia: number;
  deducaoFrequente: number;
  vezesPorSemana: number;
}

export interface ResultadoProvisao {
  diasTotais: number;
  diasCalculados: number; // Quantos dias entraram na conta (ignorando as folgas)
  faturamentoBruto: number;
  totalAbastecimentos: number;
  deducoes: number;
  resultadoLiquido: number;
}

export function calcularProvisaoPeriodo(params: ParametrosProvisao): ResultadoProvisao {
  const { dataInicial, dataFinal, diasAtivos, valorPorDia, deducaoFrequente, vezesPorSemana } = params;

  // Garantir que as datas não têm horas
  const inicio = new Date(dataInicial.getFullYear(), dataInicial.getMonth(), dataInicial.getDate());
  const fim = new Date(dataFinal.getFullYear(), dataFinal.getMonth(), dataFinal.getDate());

  let diasTotais = 0;
  let diasCalculados = 0;
  const cursor = new Date(inicio);

  while (cursor <= fim) {
    diasTotais++;
    const diaSemana = cursor.getDay();
    
    if (diasAtivos.includes(diaSemana)) {
      diasCalculados++;
    }
    
    cursor.setDate(cursor.getDate() + 1);
  }

  const faturamentoBruto = diasCalculados * valorPorDia;
  
  // A quantidade de semanas trabalhadas = (dias calculados / dias de trabalho na semana)
  const diasTrabalhoNaSemana = diasAtivos.length;
  let deducoes = 0;
  let totalAbastecimentos = 0;

  if (diasTrabalhoNaSemana > 0 && vezesPorSemana > 0 && deducaoFrequente > 0) {
    const semanasTrabalhadas = diasCalculados / diasTrabalhoNaSemana;
    totalAbastecimentos = semanasTrabalhadas * vezesPorSemana;
    deducoes = totalAbastecimentos * deducaoFrequente;
  }

  const resultadoLiquido = faturamentoBruto - deducoes;

  return {
    diasTotais,
    diasCalculados,
    faturamentoBruto,
    totalAbastecimentos,
    deducoes,
    resultadoLiquido,
  };
}

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
