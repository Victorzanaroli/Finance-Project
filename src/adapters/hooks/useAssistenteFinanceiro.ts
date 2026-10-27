/**
 * src/adapters/hooks/useAssistenteFinanceiro.ts
 *
 * Camada: Adapters — Hook React para o Chat do Assistente Financeiro IA.
 * Conecta a UI (`app/(tabs)/calculadoras.tsx`) ao `ConsultarAssistenteFinanceiroUseCase`.
 */

import { useState, useEffect, useCallback } from "react";
import { consultarAssistenteFinanceiroUseCase } from "../composition-root";
import type {
  ChatMessage,
  FinancialContextSnapshot,
} from "../../domain/gateways/IFinancialAdvisorGateway";

function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function criarMensagemBoasVindas(ctx: FinancialContextSnapshot): ChatMessage {
  const proximoFixo = ctx.proximosGastosFixos.find((f) => f.type === "expense");
  const avisoFixo = proximoFixo
    ? `\n\n🔔 **Aviso de Gasto Fixo:** **${proximoFixo.title}** (${formatBRL(
        proximoFixo.amount
      )}) ${
        proximoFixo.diasRestantes === 0
          ? "vence **HOJE**!"
          : `vence em **${proximoFixo.diasRestantes} dia(s)** (${proximoFixo.descricaoRecorrencia}).`
      }`
    : "";

  const resumoInicial =
    ctx.totalReceitas > 0 || ctx.totalDespesas > 0
      ? `Seu saldo livre atual é de **${formatBRL(
          ctx.saldoLivre
        )}** (Receitas: ${formatBRL(ctx.totalReceitas)} | Gastos: ${formatBRL(
          ctx.totalDespesas
        )}).${
          ctx.saldoLivre > 0
            ? ` Pela regra 20/80, o ideal é guardar **${formatBRL(
                ctx.sugestaoPoupar20
              )}** neste mês.`
            : ""
        }`
      : `Já estou conectado ao seu banco de dados local! Conforme você lançar suas receitas e gastos fixos, analisarei tudo em tempo real.`;

  return {
    id: "welcome-msg",
    role: "assistant",
    content:
      `Olá! Sou seu **Consultor Financeiro IA** 🤖💙\n\n` +
      `${resumoInicial}${avisoFixo}\n\n` +
      `Pergunte-me se deve investir, quanto guardar neste mês, ou simule se um plano financeiro cabe no seu bolso!`,
    timestamp: Date.now(),
    source: "local-engine",
  };
}

export function useAssistenteFinanceiro() {
  const [contexto, setContexto] = useState<FinancialContextSnapshot | null>(null);
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [carregandoContexto, setCarregandoContexto] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const recarregarContexto = useCallback(async (resetarChat = false) => {
    setCarregandoContexto(true);
    try {
      const novoCtx = await consultarAssistenteFinanceiroUseCase.montarContexto();
      setContexto(novoCtx);
      setMensagens((prev) => {
        if (resetarChat || prev.length === 0) {
          return [criarMensagemBoasVindas(novoCtx)];
        }
        // Atualiza a mensagem de boas-vindas com os dados mais recentes mantendo o histórico
        return [criarMensagemBoasVindas(novoCtx), ...prev.slice(1)];
      });
    } catch {
      // Fallback caso ocorra erro inicial
    } finally {
      setCarregandoContexto(false);
    }
  }, []);

  useEffect(() => {
    recarregarContexto(true);
  }, [recarregarContexto]);

  const enviarPergunta = useCallback(
    async (texto: string) => {
      const perguntaLimpa = texto.trim();
      if (!perguntaLimpa || enviando) return;

      const msgUsuario: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: perguntaLimpa,
        timestamp: Date.now(),
      };

      const historicoAtual = [...mensagens, msgUsuario];
      setMensagens(historicoAtual);
      setEnviando(true);

      try {
        const resultado = await consultarAssistenteFinanceiroUseCase.perguntar(
          perguntaLimpa,
          historicoAtual
        );

        setContexto(resultado.contexto);

        const msgAssistente: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: resultado.resposta,
          timestamp: Date.now(),
          source: resultado.source,
        };

        setMensagens((prev) => [...prev, msgAssistente]);
      } catch {
        const msgErro: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Desculpe, ocorreu um erro ao analisar seus dados financeiros. Tente novamente em instantes.",
          timestamp: Date.now(),
        };
        setMensagens((prev) => [...prev, msgErro]);
      } finally {
        setEnviando(false);
      }
    },
    [enviando, mensagens]
  );

  const limparConversa = useCallback(() => {
    recarregarContexto(true);
  }, [recarregarContexto]);

  return {
    contexto,
    mensagens,
    carregandoContexto,
    enviando,
    enviarPergunta,
    limparConversa,
    recarregarContexto,
  };
}
