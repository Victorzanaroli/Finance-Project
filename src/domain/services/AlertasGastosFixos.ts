/**
 * src/domain/services/AlertasGastosFixos.ts
 *
 * Camada: Domínio — Domain Service puro para cálculo de alertas de próximos
 * gastos e receitas fixas baseados em `isFixed` e `recurrenceDay`.
 *
 * REGRA ABSOLUTA: Sem imports de infraestrutura (SQLite, Supabase, Expo).
 */

import type { Transaction } from "../entities/Transaction";
import { getQuintoDiaUtil } from "../value-objects/DataFinanceira";

export type UrgenciaVencimento = "hoje" | "proximo" | "futuro";

export interface ProximoGastoFixo {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  diaVencimento: number;
  dataVencimentoISO: string;
  diasRestantes: number;
  urgencia: UrgenciaVencimento;
  descricaoRecorrencia: string;
}

const pad = (n: number): string => String(n).padStart(2, "0");

/**
 * Resolve o dia numérico do vencimento para um determinado ano e mês (1-12).
 */
export function resolverDiaVencimento(
  recurrenceDay: string | null,
  fallbackDateISO: string,
  ano: number,
  mes: number
): { dia: number; descricao: string } {
  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();

  if (recurrenceDay === "quinto_dia_util") {
    const quintoDia = getQuintoDiaUtil(ano, mes);
    return {
      dia: Math.min(quintoDia, ultimoDiaDoMes),
      descricao: `5º dia útil (dia ${pad(quintoDia)})`,
    };
  }

  if (recurrenceDay) {
    const parsed = parseInt(recurrenceDay, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 31) {
      const diaAjustado = Math.min(parsed, ultimoDiaDoMes);
      return {
        dia: diaAjustado,
        descricao: `Todo dia ${pad(parsed)}`,
      };
    }
  }

  // Fallback para o dia da data ISO original da transação
  const partes = fallbackDateISO.split("-");
  const diaOriginal = partes.length === 3 ? parseInt(partes[2], 10) : 1;
  const diaValido = Number.isNaN(diaOriginal) ? 1 : Math.min(Math.max(diaOriginal, 1), ultimoDiaDoMes);

  return {
    dia: diaValido,
    descricao: `Todo dia ${pad(diaValido)}`,
  };
}

/**
 * Calcula os próximos gastos (e receitas) fixos ordenados pelo vencimento mais próximo.
 *
 * @param transacoes Lista de transações (filtra internamente `isFixed === true`).
 * @param dataReferencia Data base para o cálculo (default: hoje local).
 * @param diasJanela Quantidade máxima de dias à frente para incluir (default: 31 dias).
 */
export function calcularProximosGastosFixos(
  transacoes: Transaction[],
  dataReferencia: Date = new Date(),
  diasJanela = 31
): ProximoGastoFixo[] {
  const hoje = new Date(
    dataReferencia.getFullYear(),
    dataReferencia.getMonth(),
    dataReferencia.getDate()
  );

  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1; // 1..12

  // Deduplica por título + categoria + tipo caso haja lançamentos repetidos de meses anteriores
  const fixasUnicas = new Map<string, Transaction>();
  for (const tx of transacoes) {
    if (!tx.isFixed) continue;
    const chave = `${tx.type}:${tx.title.trim().toLowerCase()}:${tx.category.toLowerCase()}`;
    const existente = fixasUnicas.get(chave);
    if (!existente || tx.updatedAt > existente.updatedAt) {
      fixasUnicas.set(chave, tx);
    }
  }

  const alertas: ProximoGastoFixo[] = [];

  for (const tx of fixasUnicas.values()) {
    let { dia, descricao } = resolverDiaVencimento(
      tx.recurrenceDay,
      tx.date,
      anoAtual,
      mesAtual
    );

    let dataVencimento = new Date(anoAtual, mesAtual - 1, dia);

    // Se o dia já passou neste mês, projeta para o próximo mês
    if (dataVencimento.getTime() < hoje.getTime()) {
      const proximoMes = mesAtual === 12 ? 1 : mesAtual + 1;
      const proximoAno = mesAtual === 12 ? anoAtual + 1 : anoAtual;
      const resolvidoProx = resolverDiaVencimento(
        tx.recurrenceDay,
        tx.date,
        proximoAno,
        proximoMes
      );
      dia = resolvidoProx.dia;
      descricao = resolvidoProx.descricao;
      dataVencimento = new Date(proximoAno, proximoMes - 1, dia);
    }

    const diffMs = dataVencimento.getTime() - hoje.getTime();
    const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0 || diasRestantes > diasJanela) {
      continue;
    }

    const urgencia: UrgenciaVencimento =
      diasRestantes === 0 ? "hoje" : diasRestantes <= 5 ? "proximo" : "futuro";

    const dataVencimentoISO = `${dataVencimento.getFullYear()}-${pad(
      dataVencimento.getMonth() + 1
    )}-${pad(dataVencimento.getDate())}`;

    alertas.push({
      id: tx.id,
      title: tx.title,
      amount: tx.amount,
      category: tx.category,
      type: tx.type,
      diaVencimento: dia,
      dataVencimentoISO,
      diasRestantes,
      urgencia,
      descricaoRecorrencia: descricao,
    });
  }

  return alertas.sort((a, b) => a.diasRestantes - b.diasRestantes || b.amount - a.amount);
}
