/**
 * src/domain/value-objects/Meses.ts
 *
 * Camada: Domínio — nomes dos meses (linguagem ubíqua em pt-BR) e validação de mês.
 * Substitui as 3 cópias da lista que existiam em hooks e componentes.
 */

export const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

/** @throws Error se `mes` não for um inteiro entre 1 e 12. */
export function validarMes(mes: number): void {
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error("mês deve ser um inteiro entre 1 e 12.");
  }
}

/** Nome do mês (1 = Janeiro ... 12 = Dezembro). */
export function nomeDoMes(mes: number): string {
  validarMes(mes);
  return MESES_NOMES[mes - 1];
}
