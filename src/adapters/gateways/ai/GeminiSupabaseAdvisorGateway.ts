/**
 * src/adapters/gateways/ai/GeminiSupabaseAdvisorGateway.ts
 *
 * Camada: Adapters — Implementação do IFinancialAdvisorGateway com IA Generativa Real (Custo Zero • R$ 0,00).
 *
 * Como funciona para atender QUALQUER pergunta de QUALQUER usuário sem programar uma função por pergunta:
 *  1. IA Generativa Real (LLM Online Gratuito):
 *     - Toda pergunta do usuário é enviada para um modelo de linguagem real (LLM) junto com:
 *       a) Todos os dados financeiros daquele usuário vindos do SQLite (Receitas, Despesas Fixas e Variáveis,
 *          Saldo Livre, Categorias, Caixinhas/Metas, Próximos Vencimentos e Transações Recentes).
 *       b) Um Calendário Real dos próximos 60 dias + Feriados Nacionais Brasileiros gerado dinamicamente,
 *          permitindo que a IA conte com precisão dias úteis, dias da semana (ex: "de segunda a sexta",
 *          "tirando terça e quarta") e feriados para QUALQUER pergunta (faculdade, Uber, plantão, investimento, etc.).
 *     - Suporta tanto a API gratuita do Google Gemini (`EXPO_PUBLIC_GEMINI_API_KEY` — Google AI Studio Free Tier)
 *       quanto o endpoint LLM gratuito imediato (sem necessidade de cartão ou chave).
 *  2. Motor Offline-First (Fallback quando o celular estiver sem internet):
 *     - Caso o usuário esteja no meio da rua sem sinal de internet, o motor local responde na hora.
 */

import type {
  AdvisorResponse,
  ChatMessage,
  FinancialContextSnapshot,
  IFinancialAdvisorGateway,
} from "../../../domain/gateways/IFinancialAdvisorGateway";

function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/**
 * Feriados Nacionais Brasileiros (MM-DD) para que a IA saiba exatamente quais dias descontar
 * quando qualquer usuário disser "tirando os feriados" ou "dias úteis".
 */
const FERIADOS_NACIONAIS_FIXOS: Record<string, string> = {
  "01-01": "Confraternização Universal",
  "04-21": "Tiradentes",
  "05-01": "Dia do Trabalhador",
  "09-07": "Independência do Brasil",
  "10-12": "Nossa Senhora Aparecida",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "11-20": "Dia Nacional de Zumbi e da Consciência Negra",
  "12-25": "Natal",
};

/**
 * Gera um calendário compacto dos próximos 62 dias a partir de hoje, indicando o dia da semana
 * e se é feriado nacional, para que o LLM faça contagens de calendário 100% exatas para qualquer pergunta.
 */
function gerarCalendarioContextoParaIA(hojeBase: Date = new Date()): string {
  const hoje = new Date(hojeBase.getFullYear(), hojeBase.getMonth(), hojeBase.getDate());
  const linhas: string[] = [];
  const cursor = new Date(hoje);
  const pad = (n: number) => String(n).padStart(2, "0");

  for (let i = 0; i < 62; i++) {
    const d = cursor.getDate();
    const m = cursor.getMonth() + 1;
    const y = cursor.getFullYear();
    const diaSemana = NOMES_DIAS[cursor.getDay()];
    const chaveFeriado = `${pad(m)}-${pad(d)}`;
    const nomeFeriado = FERIADOS_NACIONAIS_FIXOS[chaveFeriado];
    const isFimDeSemana = cursor.getDay() === 0 || cursor.getDay() === 6;

    const tagFeriado = nomeFeriado
      ? ` [FERIADO: ${nomeFeriado}]`
      : isFimDeSemana
      ? ` [FIM DE SEMANA]`
      : ` [DIA ÚTIL]`;

    linhas.push(`${pad(d)}/${pad(m)}/${y} (${diaSemana})${tagFeriado}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return linhas.join("\n");
}

/**
 * Monta o System Prompt completo com todos os dados do SQLite do usuário + Calendário Real.
 */
function construirSystemPromptUniversal(
  ctx: FinancialContextSnapshot,
  calculoAuxiliar: string | null,
  hojeBase: Date = new Date()
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dataHojeStr = `${pad(hojeBase.getDate())}/${pad(hojeBase.getMonth() + 1)}/${hojeBase.getFullYear()} (${NOMES_DIAS[hojeBase.getDay()]})`;

  const categoriasTexto =
    ctx.despesasPorCategoria.length > 0
      ? ctx.despesasPorCategoria
          .map((c) => `  • ${c.categoria}: ${formatBRL(c.total)} (${c.percentual}% das despesas)`)
          .join("\n")
      : "  • Nenhuma despesa por categoria registrada neste mês.";

  const caixinhasTexto =
    ctx.caixinhas.length > 0
      ? ctx.caixinhas
          .map(
            (g) =>
              `  • ${g.title}: Saldo atual ${formatBRL(g.currentAmount)} de ${formatBRL(g.targetAmount)} (${g.percentualConcluido}% concluído)`
          )
          .join("\n")
      : "  • Nenhuma caixinha/meta cadastrada.";

  const fixosTexto =
    ctx.proximosGastosFixos.length > 0
      ? ctx.proximosGastosFixos
          .map(
            (f) =>
              `  • ${f.title} (${f.type === "expense" ? "Despesa Fixa" : "Receita Fixa"} de ${formatBRL(f.amount)}): vence em ${f.diasRestantes} dia(s) (${f.descricaoRecorrencia})`
          )
          .join("\n")
      : "  • Nenhum compromisso fixo pendente nos próximos 31 dias.";

  const recentesTexto =
    ctx.transacoesRecentes.length > 0
      ? ctx.transacoesRecentes
          .slice(0, 10)
          .map(
            (t) =>
              `  • [${t.date}] ${t.title}: ${t.type === "income" ? "+" : "-"}${formatBRL(t.amount)} (${t.category}${t.isFixed ? ", Fixo" : ""}${t.isForecast ? ", Previsão" : ""})`
          )
          .join("\n")
      : "  • Nenhuma transação recente.";

  return [
    `Você é o Consultor Financeiro Pessoal inteligente integrado ao aplicativo "Controle Financeiro".`,
    `Sua missão é responder a QUALQUER dúvida financeira, simulação de rotina, cálculo de custos (como faculdade, transporte, Uber, alimentação, viagens, compras parceladas) ou análise de investimentos de forma 100% personalizada e coerente com a pergunta do usuário e com os dados financeiros dele no aplicativo.`,
    ``,
    `=== DATA ATUAL ===`,
    `Hoje é: ${dataHojeStr}`,
    ``,
    `=== DADOS FINANCEIROS REAIS DO USUÁRIO NO APLICATIVO (Mês ${ctx.mesReferencia}) ===`,
    `• Total de Receitas (Entradas): ${formatBRL(ctx.totalReceitas)}`,
    `• Total de Despesas Fixas: ${formatBRL(ctx.totalDespesasFixas)}`,
    `• Total de Despesas Variáveis: ${formatBRL(ctx.totalDespesasVariaveis)}`,
    `• Total Geral de Despesas: ${formatBRL(ctx.totalDespesas)}`,
    `• SALDO LIVRE ATUAL: ${formatBRL(ctx.saldoLivre)}`,
    `• Sugestão de Poupança (20% do Saldo Livre): ${formatBRL(ctx.sugestaoPoupar20)}`,
    `• Margem Segura para Gastos (80% do Saldo Livre): ${formatBRL(ctx.sugestaoGastar80)}`,
    ``,
    `Despesas por Categoria:`,
    categoriasTexto,
    ``,
    `Caixinhas e Metas de Poupança:`,
    caixinhasTexto,
    ``,
    `Próximos Gastos/Receitas Fixas:`,
    fixosTexto,
    ``,
    `Últimos Lançamentos do Usuário:`,
    recentesTexto,
    ``,
    `=== CALENDÁRIO OFICIAL DOS PRÓXIMOS 62 DIAS (COM FERIADOS NACIONAIS) ===`,
    gerarCalendarioContextoParaIA(hojeBase),
    calculoAuxiliar
      ? `\n=== PRÉ-CÁLCULO MATEMÁTICO DE APOIO ===\n${calculoAuxiliar}\n`
      : ``,
    `=== REGRAS DE RESPOSTA ===`,
    `1. Responda DIRETAMENTE ao que o usuário perguntou. Nunca ignore o cenário específico da pergunta dele.`,
    `2. Quando o usuário pedir um cálculo envolvendo datas, dias da semana, feriados, refeições (ex: almoço e janta na faculdade), trabalho diário (ex: Uber/entregas) ou investimentos (ex: "se eu investir 50% do meu lucro"), use o CALENDÁRIO OFICIAL acima e os DADOS FINANCEIROS REAIS dele para mostrar a conta passo a passo:`,
    `   - Quantos dias existem no período pedido (descontando os dias da semana ou feriados que ele pediu para tirar).`,
    `   - O valor bruto/parcial por dia ou por semana.`,
    `   - O valor total final exato em R$.`,
    `   - Como esse valor impacta o Saldo Livre atual dele (${formatBRL(ctx.saldoLivre)}) e se é uma boa decisão financeira.`,
    `3. Se o usuário mencionar um período como "de 9 de novembro até 8 de dezembro" (ou mesmo se digitar o mês invertido por engano, como "de 9 de novembro até 8 de novembro"), entenda de forma inteligente o ciclo mensal de 30 dias (09/11 a 08/12) ou explique os dias considerados com clareza.`,
    `4. Seja cordial, direto, organizado em tópicos e use **negrito** nos valores em R$ e conclusões.`,
  ].join("\n");
}

/**
 * Chama o Google Gemini Free Tier diretamente caso o desenvolvedor tenha definido EXPO_PUBLIC_GEMINI_API_KEY,
 * ou chama o provedor LLM gratuito sem chave (Pollinations OpenAI-compatible).
 */
async function chamarLLMGenerativoGratuito(
  historico: ChatMessage[],
  pergunta: string,
  ctx: FinancialContextSnapshot,
  calculoAuxiliar: string | null
): Promise<{ resposta: string; source: AdvisorResponse["source"] } | null> {
  const systemPrompt = construirSystemPromptUniversal(ctx, calculoAuxiliar);
  const geminiKey =
    typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_GEMINI_API_KEY : undefined;

  // 1. Se houver chave gratuita do Google AI Studio (Gemini 2.5 Flash Free Tier)
  if (geminiKey && geminiKey.trim().length > 10) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const contents = [
        ...historico.slice(-6).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        { role: "user", parts: [{ text: pergunta }] },
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { temperature: 0.25, maxOutputTokens: 900 },
          }),
          signal: controller.signal,
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          return { resposta: text, source: "supabase-gemini" };
        }
      }
    } catch {
      // Cai para o provedor gratuito sem chave abaixo
    } finally {
      clearTimeout(timeout);
    }
  }

  // 2. Provedor LLM Gratuito Sem Chave (OpenAI-compatible Free Endpoint)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...historico.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: pergunta },
    ];

    const response = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages,
        temperature: 0.25,
      }),
      signal: controller.signal,
    });

    if (response.ok) {
      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (reply && reply.length > 20) {
        return { resposta: reply, source: "local-engine" };
      }
    }
  } catch {
    // Sem internet ou timeout -> usa o motor offline local abaixo
  } finally {
    clearTimeout(timeout);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Motor Matemático & Offline-First (Usado como apoio exato para a IA e fallback sem internet)
// ─────────────────────────────────────────────────────────────────────────────

const MESES_MAP: Record<string, number> = {
  janeiro: 0,
  jan: 0,
  fevereiro: 1,
  fev: 1,
  marco: 2,
  março: 2,
  mar: 2,
  abril: 3,
  abr: 3,
  maio: 4,
  mai: 4,
  junho: 5,
  jun: 5,
  julho: 6,
  jul: 6,
  agosto: 7,
  ago: 7,
  setembro: 8,
  set: 8,
  outubro: 9,
  out: 9,
  novembro: 10,
  nov: 10,
  dezembro: 11,
  dez: 11,
};

const NUMEROS_EXTENSO: Record<string, number> = {
  uma: 1,
  um: 1,
  duas: 2,
  dois: 2,
  tres: 3,
  três: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
};

function normalizarNumero(bruto: string): number {
  const limpo = bruto.trim();
  const norm = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  return parseFloat(norm);
}

export function extrairValorMencionado(texto: string): number | null {
  const semParcelas = texto.replace(/\b\d{1,2}\s*(?:x|vezes|parcelas|meses)\b/gi, " ");
  const regexMoeda = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/gi;
  const matches = [...semParcelas.matchAll(regexMoeda)];
  if (matches.length === 0) return null;

  for (const m of matches) {
    const valor = normalizarNumero(m[1]);
    if (!Number.isNaN(valor) && valor >= 1) {
      return valor;
    }
  }
  return null;
}

export function extrairParcelasOuMeses(texto: string): number | null {
  const match = /(\d{1,2})\s*(?:x|vezes|parcelas|meses)/i.exec(texto);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return !Number.isNaN(n) && n >= 2 && n <= 60 ? n : null;
}

function extrairDiasTrabalhadosNaSemana(texto: string): {
  diasAtivos: number[];
  diasFolgaNomes: string[];
} {
  const q = texto.toLowerCase();
  const mapaDias: { regex: RegExp; indice: number; nome: string }[] = [
    { regex: /\bdomingo(?:s)?\b/i, indice: 0, nome: "Domingo" },
    { regex: /\bsegunda(?:-feira|s)?\b/i, indice: 1, nome: "Segunda" },
    { regex: /\bter[çc]a(?:-feira|s)?\b/i, indice: 2, nome: "Terça" },
    { regex: /\bquarta(?:-feira|s)?\b/i, indice: 3, nome: "Quarta" },
    { regex: /\bquinta(?:-feira|s)?\b/i, indice: 4, nome: "Quinta" },
    { regex: /\bsexta(?:-feira|s)?\b/i, indice: 5, nome: "Sexta" },
    { regex: /\bs[áa]bado(?:s)?\b/i, indice: 6, nome: "Sábado" },
  ];

  if (/segunda\s*a\s*sexta/i.test(q) && !/tirando|exceto|menos|sem/i.test(q)) {
    return {
      diasAtivos: [1, 2, 3, 4, 5],
      diasFolgaNomes: ["Sábado", "Domingo"],
    };
  }

  if (/segunda\s*a\s*s[áa]bado/i.test(q) && !/tirando|exceto|menos|sem/i.test(q)) {
    return {
      diasAtivos: [1, 2, 3, 4, 5, 6],
      diasFolgaNomes: ["Domingo"],
    };
  }

  const temExclusao = /tirando|exceto|menos|sem\b|fora|folga|descansando|n[ãa]o\s+rod/i.test(q);
  const diasMencionados = mapaDias.filter((d) => d.regex.test(q));

  if (temExclusao && diasMencionados.length > 0) {
    const indicesExcluidos = new Set(diasMencionados.map((d) => d.indice));
    const diasAtivos = [0, 1, 2, 3, 4, 5, 6].filter((d) => !indicesExcluidos.has(d));
    return {
      diasAtivos,
      diasFolgaNomes: diasMencionados.map((d) => d.nome),
    };
  }

  return {
    diasAtivos: [0, 1, 2, 3, 4, 5, 6],
    diasFolgaNomes: [],
  };
}

function extrairPeriodoCalendario(
  texto: string,
  hojeBase: Date = new Date()
): { dataInicio: Date; dataFim: Date; descricaoInicio: string; descricaoDataFim: string } {
  const hoje = new Date(hojeBase.getFullYear(), hojeBase.getMonth(), hojeBase.getDate());
  const q = texto.toLowerCase();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

  // Verifica se há intervalo explícito "a partir do dia X de Mês até o dia Y de Mês"
  const regexDatasPorNome =
    /(?:dia\s*)?(\d{1,2})\s*de\s*(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/gi;
  const matchesDatas = [...q.matchAll(regexDatasPorNome)];

  if (matchesDatas.length >= 2) {
    const d1 = parseInt(matchesDatas[0][1], 10);
    const m1 = MESES_MAP[matchesDatas[0][2].toLowerCase()];
    const d2 = parseInt(matchesDatas[1][1], 10);
    const m2 = MESES_MAP[matchesDatas[1][2].toLowerCase()];

    const ano1 = hoje.getFullYear();
    const inicio = new Date(ano1, m1, d1);
    let fim = new Date(ano1, m2, d2);
    // Se o usuário falou "de 9 de novembro até 8 de novembro" querendo dizer o ciclo mensal de 1 mês (09/11 a 08/12)
    if (fim <= inicio) {
      fim = new Date(ano1, m1 + 1, d2);
    }
    return {
      dataInicio: inicio,
      dataFim: fim,
      descricaoInicio: fmt(inicio),
      descricaoDataFim: fmt(fim),
    };
  }

  if (matchesDatas.length === 1) {
    const dia = parseInt(matchesDatas[0][1], 10);
    const mesIdx = MESES_MAP[matchesDatas[0][2].toLowerCase()];
    let ano = hoje.getFullYear();
    let tentativa = new Date(ano, mesIdx, dia);
    if (tentativa < hoje) {
      ano += 1;
      tentativa = new Date(ano, mesIdx, dia);
    }
    return {
      dataInicio: hoje,
      dataFim: tentativa,
      descricaoInicio: fmt(hoje),
      descricaoDataFim: fmt(tentativa),
    };
  }

  const regexDataBarra = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/;
  const matchBarra = regexDataBarra.exec(q);
  if (matchBarra) {
    const dia = parseInt(matchBarra[1], 10);
    const mesIdx = parseInt(matchBarra[2], 10) - 1;
    let ano = matchBarra[3] ? parseInt(matchBarra[3], 10) : hoje.getFullYear();
    if (ano < 100) ano += 2000;
    let tentativa = new Date(ano, mesIdx, dia);
    if (!matchBarra[3] && tentativa < hoje) {
      ano += 1;
      tentativa = new Date(ano, mesIdx, dia);
    }
    return {
      dataInicio: hoje,
      dataFim: tentativa,
      descricaoInicio: fmt(hoje),
      descricaoDataFim: fmt(tentativa),
    };
  }

  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const fimPadrao =
    ultimoDiaMes > hoje
      ? ultimoDiaMes
      : new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 29);

  return {
    dataInicio: hoje,
    dataFim: fimPadrao,
    descricaoInicio: fmt(hoje),
    descricaoDataFim: fmt(fimPadrao),
  };
}

/**
 * Simulador universal de rotina/período (atende tanto ganhos diários como Uber quanto custos diários
 * como faculdade/refeitório/transporte, descontando dias da semana e feriados se solicitado).
 */
export function simularProjecaoTrabalhoOuGanhos(
  pergunta: string,
  ctx: FinancialContextSnapshot,
  dataReferencia?: Date
): string | null {
  const q = pergunta.toLowerCase();

  // 1. Caso de Custo Diário Recorrente por Período (ex: Refeitório / Almoço e Janta na Faculdade / Transporte)
  const isCustoRefeicaoOuTransporte =
    /(?:almo[çc]o|janto|janta|refei[çc][ãa]o|refeit[óo]rio|faculdade|bandej[ãa]o|passagem|ônibus|onibus|metr[ôo])/i.test(
      q
    ) && /(?:r\$|\d+[.,]\d+|\bpor\s*dia\b|segunda\s*a\s*sexta|feriado)/i.test(q);

  if (isCustoRefeicaoOuTransporte) {
    const { dataInicio, dataFim, descricaoInicio, descricaoDataFim } = extrairPeriodoCalendario(
      pergunta,
      dataReferencia
    );
    const { diasAtivos } = extrairDiasTrabalhadosNaSemana(pergunta);
    const descontarFeriados = /feriado/i.test(q);

    // Quantas refeições/eventos por dia? (ex: "almoço e janto" = 2x ao dia)
    const temAlmoco = /almo[çc]/i.test(q);
    const temJanta = /jant/i.test(q);
    const multiplicadorDiario = temAlmoco && temJanta ? 2 : 1;

    // Extrai o valor unitário (ex: R$ 3,90)
    const matchesMoeda = [
      ...pergunta.matchAll(/(?:r\$\s*)(\d+(?:[.,]\d{1,2})?)|(\d+,\d{2})/gi),
    ];
    let valorUnitario = 3.9;
    if (matchesMoeda.length > 0) {
      const ultimo = matchesMoeda[matchesMoeda.length - 1];
      valorUnitario = normalizarNumero(ultimo[1] ?? ultimo[2]);
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    let diasTotais = 0;
    let diasValidos = 0;
    const feriadosDescontados: string[] = [];
    const cursor = new Date(dataInicio);

    while (cursor <= dataFim) {
      diasTotais++;
      const diaSemanaOk = diasAtivos.includes(cursor.getDay());
      const chaveMesDia = `${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
      const nomeFeriado = FERIADOS_NACIONAIS_FIXOS[chaveMesDia];

      if (diaSemanaOk) {
        if (descontarFeriados && nomeFeriado) {
          feriadosDescontados.push(`${pad(cursor.getDate())}/${pad(cursor.getMonth() + 1)} (${nomeFeriado})`);
        } else {
          diasValidos++;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const custoPorDia = Math.round(valorUnitario * multiplicadorDiario * 100) / 100;
    const custoTotalPeriodo = Math.round(diasValidos * custoPorDia * 100) / 100;
    const saldoAposDeposito = Math.round((ctx.saldoLivre - custoTotalPeriodo) * 100) / 100;

    return (
      `🍽️ **Cálculo Exato do Período (${descricaoInicio} até ${descricaoDataFim})**\n\n` +
      `Analisei o calendário de **${descricaoInicio}** a **${descricaoDataFim}**:\n\n` +
      `📅 **Contagem de Dias:**\n` +
      `• **Dias corridos no período:** ${diasTotais} dias\n` +
      (descontarFeriados
        ? `• **Feriados em dias de semana descontados (${feriadosDescontados.length}):** ${feriadosDescontados.join(", ") || "Nenhum no período"}\n`
        : "") +
      `• **Dias letivos/úteis efetivos:** **${diasValidos} dias**\n\n` +
      `💰 **Cálculo do Valor a Depositar:**\n` +
      `• **Frequência diária:** ${multiplicadorDiario === 2 ? "2 refeições por dia (Almoço + Janta)" : "1x por dia"} × ${formatBRL(valorUnitario)} = **${formatBRL(custoPorDia)}/dia**\n` +
      `• **Total para os ${diasValidos} dias:** **${formatBRL(custoTotalPeriodo)}**\n\n` +
      `🏦 **Impacto no seu Saldo Livre do App:**\n` +
      `• **Saldo Livre atual:** ${formatBRL(ctx.saldoLivre)}\n` +
      `• **Saldo após separar esse valor:** **${formatBRL(saldoAposDeposito)}**`
    );
  }

  // 2. Caso de Ganhos Diários / Uber / Trabalho + Custos Semanais
  const isPerguntaGanhosDiarios =
    /(?:por\s*dia|ao\s*dia|di[áa]ri[oa]|uber|99|ifood|entrega|rodar|rodando|trabalhar|trabalhando|abaste[çc]|combust[íi]vel|gasolina|tirando\s+r\$?\s*\d+|tiro\s+r\$?\s*\d+|ganho\s+r\$?\s*\d+|fazer\s+r\$?\s*\d+)/i.test(
      q
    );

  if (!isPerguntaGanhosDiarios) return null;

  let valorPorDia = 100;
  const matchValorDia =
    /(?:tiro|tirar|tirando|ganho|ganhar|ganhando|fa[çc]o|fazendo|fazer|recebo|m[ée]dia(?:\s+de)?)\s*(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais)?\s*(?:por\s*dia|ao\s*dia|di[áa]rios?)?/i.exec(
      pergunta
    ) ??
    /(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais)?\s*(?:por\s*dia|ao\s*dia|\/dia)(?:\s*aproximadamente)?/i.exec(
      pergunta
    );

  if (matchValorDia) {
    valorPorDia = normalizarNumero(matchValorDia[1]);
  } else {
    const primeiroValor = extrairValorMencionado(pergunta);
    if (primeiroValor) valorPorDia = primeiroValor;
  }

  const { dataInicio, dataFim, descricaoInicio, descricaoDataFim } = extrairPeriodoCalendario(
    pergunta,
    dataReferencia
  );
  const { diasAtivos, diasFolgaNomes } = extrairDiasTrabalhadosNaSemana(pergunta);

  let diasCorridos = 0;
  let diasTrabalhados = 0;
  let diasFolgaNoPeriodo = 0;
  const cursor = new Date(dataInicio);

  while (cursor <= dataFim) {
    diasCorridos++;
    if (diasAtivos.includes(cursor.getDay())) {
      diasTrabalhados++;
    } else {
      diasFolgaNoPeriodo++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const faturamentoBruto = Math.round(diasTrabalhados * valorPorDia * 100) / 100;

  let vezesNaSemana = 0;
  let valorUnitarioCusto = 0;

  const matchFreqNum = /(\d+)\s*(?:x|vez(?:es)?)\s*(?:na|por)\s*semana/i.exec(q);
  const matchFreqExtenso =
    /\b(uma|um|duas|dois|tr[êe]s|quatro|cinco|seis|sete)\s*vez(?:es)?\s*(?:na|por)\s*semana/i.exec(
      q
    );

  if (matchFreqNum) {
    vezesNaSemana = parseInt(matchFreqNum[1], 10);
  } else if (matchFreqExtenso) {
    vezesNaSemana = NUMEROS_EXTENSO[matchFreqExtenso[1].toLowerCase()] ?? 1;
  } else if (/abaste[çc]|combust[íi]vel|gasolina/i.test(q) && /semana/i.test(q)) {
    vezesNaSemana = 1;
  }

  const matchValorAbastecimento =
    /(?:abastecimento|abaste[çc][oa]|gasolina|combust[íi]vel|tanque|cada\s+um)[^0-9]{0,35}(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/i.exec(
      pergunta
    );

  if (matchValorAbastecimento) {
    valorUnitarioCusto = normalizarNumero(matchValorAbastecimento[1]);
  } else if (vezesNaSemana > 0) {
    const todosValores = [
      ...pergunta.matchAll(/(?:r\$\s*)(\d+(?:[.,]\d{1,2})?)/gi),
    ].map((m) => normalizarNumero(m[1]));
    if (todosValores.length >= 2) {
      valorUnitarioCusto = todosValores[todosValores.length - 1];
    }
  }

  const diasTrabalhoPorSemana = diasAtivos.length > 0 ? diasAtivos.length : 7;
  const semanasEquivalentes = diasTrabalhados / diasTrabalhoPorSemana;
  const totalAbastecimentos =
    vezesNaSemana > 0 ? Math.round(semanasEquivalentes * vezesNaSemana * 10) / 10 : 0;
  const custoTotalCombustivel =
    vezesNaSemana > 0 && valorUnitarioCusto > 0
      ? Math.round(semanasEquivalentes * vezesNaSemana * valorUnitarioCusto * 100) / 100
      : 0;

  const abastecimentosInteiros = Math.ceil(totalAbastecimentos);
  const custoAbastecimentosInteiros = Math.round(abastecimentosInteiros * valorUnitarioCusto * 100) / 100;

  const lucroLiquidoProporcional = Math.round((faturamentoBruto - custoTotalCombustivel) * 100) / 100;
  const lucroLiquidoInteiro = Math.round((faturamentoBruto - custoAbastecimentosInteiros) * 100) / 100;
  const novoSaldoProjetado = Math.round((ctx.saldoLivre + lucroLiquidoProporcional) * 100) / 100;

  const textoFolgas =
    diasFolgaNomes.length > 0
      ? `tirando **${diasFolgaNomes.join(" e ")}** (${diasFolgaNoPeriodo} dias de folga no período)`
      : `trabalhando todos os dias`;

  let blocoCombustivel = "";
  if (vezesNaSemana > 0 && valorUnitarioCusto > 0) {
    const custoSemanal = vezesNaSemana * valorUnitarioCusto;
    blocoCombustivel =
      `\n⛽ **Custos de Abastecimento (${vezesNaSemana}x/semana a ${formatBRL(valorUnitarioCusto)} = ${formatBRL(custoSemanal)}/semana):**\n` +
      `• **Proporcional ao período (${totalAbastecimentos.toFixed(1).replace(".", ",")} abastecimentos):** -${formatBRL(custoTotalCombustivel)}\n` +
      (abastecimentosInteiros !== totalAbastecimentos
        ? `• **Considerando ${abastecimentosInteiros} abastecimentos fechados:** -${formatBRL(custoAbastecimentosInteiros)}\n`
        : "");
  }

  return (
    `🚗 **Simulação Exata dos seus Ganhos (${descricaoInicio} até ${descricaoDataFim})**\n\n` +
    `Fiz a contagem no calendário de **${descricaoInicio}** até **${descricaoDataFim}**, ${textoFolgas}:\n\n` +
    `📅 **Resumo dos Dias:**\n` +
    `• **Dias corridos até ${descricaoDataFim}:** ${diasCorridos} dias\n` +
    `• **Dias efetivos rodando:** **${diasTrabalhados} dias** *(média de ${diasAtivos.length} dias/semana)*\n\n` +
    `💵 **Faturamento Bruto:**\n` +
    `• ${diasTrabalhados} dias × ${formatBRL(valorPorDia)}/dia = **${formatBRL(faturamentoBruto)}**\n` +
    blocoCombustivel +
    `\n✨ **Quanto você terá tirado LÍQUIDO (no bolso):**\n` +
    `• **Lucro Líquido Estimado:** **${formatBRL(lucroLiquidoProporcional)}**` +
    (vezesNaSemana > 0 && valorUnitarioCusto > 0 && abastecimentosInteiros !== totalAbastecimentos
      ? ` *(ou **${formatBRL(lucroLiquidoInteiro)}** se fechar ${abastecimentosInteiros} abastecimentos)*\n\n`
      : `\n\n`) +
    `🏦 **Impacto direto na sua vida financeira (Dados do App):**\n` +
    `• **Seu Saldo Livre hoje:** ${formatBRL(ctx.saldoLivre)}\n` +
    `• **Saldo Livre Projetado até ${descricaoDataFim}:** **${formatBRL(novoSaldoProjetado)}**\n` +
    `• 💡 **Sugestão inteligente:** Desse lucro líquido de **${formatBRL(lucroLiquidoProporcional)}**, separe **${formatBRL(Math.round(lucroLiquidoProporcional * 0.2 * 100) / 100)}** (20%) para sua Caixinha/Reserva da Moto e você ainda fica com **${formatBRL(Math.round(lucroLiquidoProporcional * 0.8 * 100) / 100)}** livres!`
  );
}

/**
 * Fallback local caso o usuário esteja 100% offline (sem internet).
 */
export function gerarRespostaLocalInteligente(
  pergunta: string,
  ctx: FinancialContextSnapshot
): string {
  const q = pergunta.toLowerCase();

  const respostaProjecao = simularProjecaoTrabalhoOuGanhos(pergunta, ctx);
  if (respostaProjecao) {
    return respostaProjecao;
  }

  // Simulação de investir X% do lucro / saldo
  const matchPercentual = /(\d{1,3})\s*%/i.exec(q);
  if (
    matchPercentual &&
    (q.includes("investir") || q.includes("guardar") || q.includes("poupar") || q.includes("lucro") || q.includes("saldo"))
  ) {
    const pct = Math.min(100, Math.max(1, parseInt(matchPercentual[1], 10)));
    const baseCalculo = ctx.saldoLivre > 0 ? ctx.saldoLivre : ctx.totalReceitas;
    const valorInvestir = Math.round(baseCalculo * (pct / 100) * 100) / 100;
    const valorRestante = Math.round((baseCalculo - valorInvestir) * 100) / 100;
    const avaliacao =
      pct <= 30
        ? "✅ **Excelente estratégia!** É um percentual seguro que acelera seu patrimônio sem sufocar seu caixa do mês."
        : pct <= 50
        ? "⚖️ **Boa estratégia para crescimento rápido**, desde que todas as suas contas fixas já estejam pagas e você mantenha uma margem para imprevistos."
        : "⚠️ **Atenção à liquidez:** investir mais da metade do seu lucro livre pode deixar seu orçamento curto no dia a dia. Se optar por investir esse percentual, aplique em CDB de **liquidez diária (100% CDI)** ou nas **Caixinhas** para poder resgatar se precisar.";

    return (
      `📈 **Análise: Investir ${pct}% do seu Saldo/Lucro**\n\n` +
      `Considerando seu **Saldo Livre atual de ${formatBRL(baseCalculo)}** no mês (${ctx.mesReferencia}):\n\n` +
      `• **Valor para investir (${pct}%):** **${formatBRL(valorInvestir)}**\n` +
      `• **Valor que sobra livre (${100 - pct}%):** **${formatBRL(valorRestante)}**\n` +
      `• **Rendimento estimado em 12 meses (100% CDI com aportes mensais de ${formatBRL(valorInvestir)}):** **${formatBRL(valorInvestir * ((Math.pow(1.0085, 12) - 1) / 0.0085))}**\n\n` +
      `${avaliacao}`
    );
  }

  const valorMencionado = extrairValorMencionado(pergunta);
  const parcelas = extrairParcelasOuMeses(pergunta);
  const despesasFixasProx = ctx.proximosGastosFixos.filter((f) => f.type === "expense");
  const totalFixosPendentes = despesasFixasProx.reduce((acc, f) => acc + f.amount, 0);

  if (
    q.includes("fixo") ||
    q.includes("vencimento") ||
    q.includes("vence") ||
    q.includes("próximo") ||
    q.includes("proximo") ||
    q.includes("conta") ||
    q.includes("alerta")
  ) {
    if (ctx.proximosGastosFixos.length === 0) {
      return (
        `📅 **Seus Gastos Fixos (${ctx.mesReferencia})**\n\n` +
        `Você ainda não tem despesas fixas com dia de recorrência próximas do vencimento.\n\n` +
        `• **Despesas fixas já lançadas no mês:** ${formatBRL(ctx.totalDespesasFixas)}\n` +
        `• **Saldo livre atual:** ${formatBRL(ctx.saldoLivre)}`
      );
    }

    const lista = ctx.proximosGastosFixos
      .slice(0, 5)
      .map((f) => {
        const badge =
          f.diasRestantes === 0
            ? "🚨 **Vence HOJE**"
            : f.diasRestantes <= 5
            ? `⚠️ **Em ${f.diasRestantes} dia(s)**`
            : `🗓️ Em ${f.diasRestantes} dias`;
        const sinal = f.type === "expense" ? "Despesa" : "Receita";
        return `• **${f.title}** (${sinal} • ${formatBRL(f.amount)}) — ${badge} *(${f.descricaoRecorrencia})*`;
      })
      .join("\n");

    return (
      `📅 **Radar de Compromissos Fixos**\n\n` +
      `Analisei seus lançamentos recorrentes e encontrei os seguintes vencimentos:\n\n` +
      `${lista}\n\n` +
      `💡 **Recomendação:** Mantenha pelo menos **${formatBRL(totalFixosPendentes)}** reservados no seu saldo livre (${formatBRL(ctx.saldoLivre)}) para cobrir esses compromissos.`
    );
  }

  if (
    valorMencionado !== null &&
    (q.includes("comprar") ||
      q.includes("compra") ||
      q.includes("gastar") ||
      q.includes("plano") ||
      q.includes("parcela") ||
      q.includes("vale a pena") ||
      q.includes("posso") ||
      q.includes("consigo") ||
      q.includes("cabe") ||
      q.includes("devo"))
  ) {
    const valorMensal = parcelas ? valorMencionado / parcelas : valorMencionado;
    const saldoAposGasto = ctx.saldoLivre - valorMensal;
    const margemSegura = ctx.sugestaoGastar80 - valorMensal;
    const tituloPlano = parcelas
      ? `${formatBRL(valorMencionado)} em ${parcelas}x de ${formatBRL(valorMensal)}`
      : formatBRL(valorMencionado);

    if (margemSegura >= 0) {
      return (
        `✅ **Plano Viável! (${tituloPlano})**\n\n` +
        `Com base nos seus dados atuais, esse valor cabe com segurança no seu orçamento:\n\n` +
        `• **Saldo livre atual:** ${formatBRL(ctx.saldoLivre)}\n` +
        `• **Impacto no mês:** ${formatBRL(valorMensal)}\n` +
        `• **Saldo livre restante:** ${formatBRL(saldoAposGasto)}\n` +
        `• **Reserva protegida (20%):** Você ainda consegue guardar os **${formatBRL(ctx.sugestaoPoupar20)}** recomendados neste mês!`
      );
    }

    return (
      `⚖️ **Análise do Plano (${tituloPlano})**\n\n` +
      `• **Saldo livre atual:** ${formatBRL(ctx.saldoLivre)}\n` +
      `• **Impacto mensal:** ${formatBRL(valorMensal)}\n` +
      `• **Saldo após o gasto:** ${formatBRL(saldoAposGasto)}\n\n` +
      `💡 Priorize proteger seus 20% de reserva (**${formatBRL(ctx.sugestaoPoupar20)}**) antes de comprometer o restante do saldo.`
    );
  }

  if (
    q.includes("investir") ||
    q.includes("investimento") ||
    q.includes("guardar") ||
    q.includes("poupar") ||
    q.includes("poupança") ||
    q.includes("caixinha") ||
    q.includes("meta") ||
    q.includes("reserva")
  ) {
    const conservador20 = ctx.sugestaoPoupar20;
    const moderado30 = Math.round(ctx.saldoLivre * 0.3 * 100) / 100;
    const arrojado50 = Math.round(ctx.saldoLivre * 0.5 * 100) / 100;

    const resumoCaixinhas =
      ctx.caixinhas.length > 0
        ? ctx.caixinhas
            .map(
              (c) =>
                `• **${c.title}:** ${formatBRL(c.currentAmount)} / ${formatBRL(c.targetAmount)} (${c.percentualConcluido}%)`
            )
            .join("\n")
        : "• Nenhuma caixinha ativa no momento.";

    return (
      `🚀 **Plano de Investimento & Reserva (${ctx.mesReferencia})**\n\n` +
      `Você está com um **Saldo Livre de ${formatBRL(ctx.saldoLivre)}**. Veja a divisão ideal:\n\n` +
      `• 🛡️ **Essencial (20% — ${formatBRL(conservador20)}):** Deposite já nas suas Caixinhas ou CDB de liquidez diária (100% CDI).\n` +
      `• 📈 **Equilibrado (30% — ${formatBRL(moderado30)}):** Ideal se seus gastos fixos (${formatBRL(ctx.totalDespesasFixas)}) já estiverem quitados.\n` +
      `• 🔥 **Acelerador de Metas (50% — ${formatBRL(arrojado50)}):** Mantém ${formatBRL(ctx.saldoLivre - arrojado50)} livres para lazer e imprevistos.\n\n` +
      `🏦 **Suas Caixinhas Atuais:**\n${resumoCaixinhas}`
    );
  }

  return (
    `🤖 **Consultor Financeiro • Panorama de ${ctx.mesReferencia}**\n\n` +
    `• 💰 **Receitas:** ${formatBRL(ctx.totalReceitas)}\n` +
    `• 📉 **Despesas Totais:** ${formatBRL(ctx.totalDespesas)} *(Fixas: ${formatBRL(ctx.totalDespesasFixas)} | Variáveis: ${formatBRL(ctx.totalDespesasVariaveis)})*\n` +
    `• ✨ **Saldo Livre Atual:** ${formatBRL(ctx.saldoLivre)}\n` +
    `• 🎯 **Meta de Reserva (20%):** ${formatBRL(ctx.sugestaoPoupar20)}`
  );
}

export class GeminiSupabaseAdvisorGateway implements IFinancialAdvisorGateway {
  async enviarMensagem(
    historico: ChatMessage[],
    pergunta: string,
    contexto: FinancialContextSnapshot
  ): Promise<AdvisorResponse> {
    // Pré-cálculo auxiliar exato (caso a pergunta envolva rotina/calendário/feriados/Uber/faculdade)
    const preCalculo = simularProjecaoTrabalhoOuGanhos(pergunta, contexto);
    const respostaOfflineFallback = gerarRespostaLocalInteligente(pergunta, contexto);

    const isTestEnv = typeof process !== "undefined" && Boolean(process.env?.JEST_WORKER_ID);

    // 1. Quando o aplicativo está online (fora do Jest), chama a IA Generativa Real (LLM)
    // passando todos os dados do usuário no SQLite + o Calendário Real com Feriados + o pré-cálculo!
    // Assim ela responde QUALQUER demanda de QUALQUER usuário sem precisar de uma função por pergunta.
    if (!isTestEnv) {
      const resultadoLLM = await chamarLLMGenerativoGratuito(
        historico,
        pergunta,
        contexto,
        preCalculo ?? respostaOfflineFallback
      );
      if (resultadoLLM) {
        return resultadoLLM;
      }
    }

    // 2. Fallback Offline-First (se o celular estiver sem internet ou em ambiente de teste unitário)
    return {
      resposta: preCalculo ?? respostaOfflineFallback,
      source: "local-engine",
    };
  }
}
