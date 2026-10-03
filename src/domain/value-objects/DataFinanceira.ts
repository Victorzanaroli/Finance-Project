/**
 * src/domain/value-objects/DataFinanceira.ts
 *
 * Camada: Domínio — Funções puras para datas de negócio no formato ISO
 * "YYYY-MM-DD" (dia) e "YYYY-MM" (mês de referência).
 *
 * Por que existe: `new Date().toISOString()` devolve a data em UTC. No Brasil
 * (UTC-3), após as 21h isso retornaria o dia seguinte, registrando lançamentos
 * e fechando o resumo do mês na data errada. Aqui sempre usamos o fuso local.
 */

const pad = (n: number): string => String(n).padStart(2, "0");

/** Data local de hoje no formato "YYYY-MM-DD". */
export function hojeISO(agora: Date = new Date()): string {
  return `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}`;
}

/** Mês local atual no formato "YYYY-MM". */
export function mesISO(agora: Date = new Date()): string {
  return `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}`;
}

/** Verifica formato E existência real da data (rejeita 2025-02-29, 2024-04-31...). */
export function dataISOValida(valor: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!match) return false;

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const data = new Date(ano, mes - 1, dia);

  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}

/** Valida o formato "YYYY-MM" com mês entre 01 e 12. */
export function mesReferenciaValido(valor: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(valor);
}
