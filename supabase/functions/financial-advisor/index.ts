/**
 * supabase/functions/financial-advisor/index.ts
 *
 * Supabase Edge Function — Consultor Financeiro IA (Google Gemini Flash).
 *
 * Como fazer deploy no seu projeto Supabase:
 *   1. Instale a CLI do Supabase e faça login: `npx supabase login`
 *   2. Configure a chave do Google AI Studio (Gemini) nos secrets do Supabase:
 *      `npx supabase secrets set GEMINI_API_KEY=sua_chave_do_gemini_aqui`
 *   3. Faça o deploy da função:
 *      `npx supabase functions deploy financial-advisor`
 *
 * Por que usar Edge Function?
 *   - A chave da API do Gemini fica 100% protegida no servidor do Supabase
 *     (nunca fica exposta dentro do APK/IPA do celular).
 *   - Cada usuário autenticado no Supabase pode ter seu consumo controlado.
 *   - O modelo `gemini-2.5-flash` tem nível gratuito generoso e custa frações
 *     de centavo por mil tokens (~350 tokens por pergunta).
 */

// @ts-nocheck — Executado no runtime Deno do Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY não configurada nos secrets do Supabase.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages = [], question, context } = await req.json();

    const systemInstruction = `Você é o Consultor Financeiro IA integrado ao aplicativo Controle Financeiro Pessoal.
Responda sempre em Português do Brasil, de forma empática, direta, prática e objetiva (máximo de 3 a 4 parágrafos curtos ou tópicos claros).
Use os dados reais do usuário abaixo (extraídos do banco SQLite local do app) para fundamentar todas as suas respostas:

RESUMO DO MÊS (${context?.mesReferencia ?? "Atual"}):
- Receitas Totais: R$ ${Number(context?.totalReceitas ?? 0).toFixed(2)}
- Despesas Fixas: R$ ${Number(context?.totalDespesasFixas ?? 0).toFixed(2)}
- Despesas Variáveis: R$ ${Number(context?.totalDespesasVariaveis ?? 0).toFixed(2)}
- Despesas Totais: R$ ${Number(context?.totalDespesas ?? 0).toFixed(2)}
- Saldo Livre Atual: R$ ${Number(context?.saldoLivre ?? 0).toFixed(2)}
- Sugestão Regra 20/80: Guardar R$ ${Number(context?.sugestaoPoupar20 ?? 0).toFixed(2)} (20%) | Livre para uso R$ ${Number(context?.sugestaoGastar80 ?? 0).toFixed(2)} (80%)

DESPESAS POR CATEGORIA:
${
  context?.despesasPorCategoria?.length
    ? context.despesasPorCategoria
        .map((c: any) => `- ${c.categoria}: R$ ${Number(c.total).toFixed(2)} (${c.percentual}%)`)
        .join("\n")
    : "- Nenhuma despesa registrada neste mês."
}

CAIXINHAS / METAS DE POUPANÇA:
${
  context?.caixinhas?.length
    ? context.caixinhas
        .map(
          (g: any) =>
            `- ${g.title}: R$ ${Number(g.currentAmount).toFixed(2)} de R$ ${Number(
              g.targetAmount
            ).toFixed(2)} (${g.percentualConcluido}%)`
        )
        .join("\n")
    : "- Nenhuma caixinha cadastrada."
}

PRÓXIMOS GASTOS/RECEITAS FIXAS A VENCER:
${
  context?.proximosGastosFixos?.length
    ? context.proximosGastosFixos
        .map(
          (f: any) =>
            `- ${f.title} (${f.type === "expense" ? "Despesa" : "Receita"}): R$ ${Number(
              f.amount
            ).toFixed(2)} — vence em ${f.diasRestantes} dia(s) (${f.descricaoRecorrencia})`
        )
        .join("\n")
    : "- Nenhum gasto fixo pendente cadastrado."
}`;

    const contents = [
      ...messages.slice(-6).map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content) }],
      })),
      {
        role: "user",
        parts: [{ text: String(question) }],
      },
    ];

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 600,
        },
      }),
    });

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Não consegui gerar uma análise no momento. Tente novamente em instantes.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
