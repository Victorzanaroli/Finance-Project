/**
 * app/(tabs)/calculadoras.tsx
 *
 * Tela: Consultor IA & Calculadora Tradicional.
 * Design: Preto & Roxo (Dark Mode) e Branco & Roxo (Light Mode),
 * com Esmeralda para positivo e Coral-Âmbar Suave para alertas/negativo.
 */

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

import { formatCurrency } from "../../src/adapters/calculadoras/calculos";
import { useAssistenteFinanceiro } from "../../src/adapters/hooks/useAssistenteFinanceiro";

const SUGESTOES_RAPIDAS = [
  "🚗 Uber R$ 100/dia sem terça e quarta até 09/11 (2x R$ 70 gasolina)",
  "💰 Quanto devo guardar ou investir?",
  "📅 Quais são meus próximos gastos fixos?",
  "📊 Onde estou gastando mais neste mês?",
  "🎯 Posso fazer uma compra de R$ 350?",
];

/**
 * Renderiza texto com suporte a negrito simples (`**texto**`) em componentes Text nativos.
 */
function FormattedMessageText({
  content,
  isUser,
  isDark,
}: {
  content: string;
  isUser: boolean;
  isDark: boolean;
}) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  const baseColor = isUser ? "#ffffff" : isDark ? "#e2e8f0" : "#0f172a";
  const boldColor = isUser ? "#ffffff" : isDark ? "#c4b5fd" : "#7c3aed";

  return (
    <Text style={{ color: baseColor, fontSize: 14, lineHeight: 21 }}>
      {parts.map((part, idx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Text key={idx} style={{ fontWeight: "700", color: boldColor }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return <Text key={idx}>{part}</Text>;
      })}
    </Text>
  );
}

function CalculadoraTradicional() {
  const router = useRouter();

  const [visor, setVisor] = useState("0");
  const [expressao, setExpressao] = useState("");
  const [resultadoObtido, setResultadoObtido] = useState(false);

  const handlePress = (val: string) => {
    if (resultadoObtido) {
      if (/[0-9]/.test(val)) {
        setVisor(val);
        setExpressao("");
      } else {
        setExpressao(visor + " " + val + " ");
        setVisor("0");
      }
      setResultadoObtido(false);
      return;
    }

    if (["+", "-", "*", "/"].includes(val)) {
      setExpressao(expressao + visor + " " + val + " ");
      setVisor("0");
      return;
    }

    if (val === "=") {
      try {
        const evalStr = (expressao + visor).replace(/×/g, "*").replace(/÷/g, "/");
        // eslint-disable-next-line no-new-func
        const res = new Function(`return ${evalStr}`)();
        const finalRes = Number.isInteger(res) ? String(res) : Number(res).toFixed(2);
        setVisor(finalRes);
        setExpressao("");
        setResultadoObtido(true);
      } catch {
        setVisor("Erro");
      }
      return;
    }

    if (val === "C") {
      setVisor("0");
      setExpressao("");
      return;
    }

    if (val === "DEL") {
      setVisor(visor.length > 1 ? visor.slice(0, -1) : "0");
      return;
    }

    if (visor === "0") {
      setVisor(val === "." ? "0." : val);
    } else {
      if (val === "." && visor.includes(".")) return;
      setVisor(visor + val);
    }
  };

  const handleLancar = () => {
    if (visor === "0" || visor === "Erro") return;
    router.push({
      pathname: "/lancamentos",
      params: { openModal: "true", amount: visor, title: "Cálculo Rápido" },
    });
  };

  const botoes = [
    ["C", "DEL", "/", "*"],
    ["7", "8", "9", "-"],
    ["4", "5", "6", "+"],
    ["1", "2", "3", "="],
    ["0", ".", ""],
  ];

  return (
    <ScrollView
      className="flex-1 px-5"
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="bg-white dark:bg-[#090d16] rounded-2xl p-5 border border-violet-200 dark:border-violet-950/80 shadow-sm">
        <View className="bg-slate-50 dark:bg-[#05050A] rounded-xl p-4 items-end border border-violet-100 dark:border-violet-950/60 mb-5 h-24 justify-center">
          <Text className="text-base text-slate-500 dark:text-slate-400 mb-1 font-sans">
            {expressao}
          </Text>
          <Text
            className="text-4xl font-bold text-slate-900 dark:text-slate-100"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {visor}
          </Text>
        </View>

        <View className="gap-3 mb-5">
          {botoes.map((linha, i) => (
            <View key={i} className="flex-row gap-3 justify-between">
              {linha.map((btn, j) => {
                if (btn === "") return <View key={j} className="flex-1 aspect-square" />;
                const isOperator = ["+", "-", "*", "/", "=", "C", "DEL"].includes(btn);
                const isZero = btn === "0";
                const isEqual = btn === "=";

                let btnClass =
                  "flex-1 aspect-square bg-slate-100 dark:bg-[#05050A] rounded-xl items-center justify-center border border-slate-200/60 dark:border-slate-800/80";
                if (isZero)
                  btnClass =
                    "flex-[2.15] aspect-[2.15] bg-slate-100 dark:bg-[#05050A] rounded-xl items-center justify-center border border-slate-200/60 dark:border-slate-800/80";
                if (isOperator)
                  btnClass =
                    "flex-1 aspect-square bg-violet-100 dark:bg-violet-950/60 rounded-xl items-center justify-center border border-violet-200 dark:border-violet-800/60";
                if (isEqual)
                  btnClass =
                    "flex-1 aspect-square bg-violet-600 rounded-xl items-center justify-center shadow-sm";

                let textClass = "text-2xl font-semibold text-slate-900 dark:text-slate-100";
                if (isOperator && !isEqual)
                  textClass = "text-2xl font-semibold text-violet-700 dark:text-violet-300";
                if (isEqual) textClass = "text-2xl font-semibold text-white";

                return (
                  <TouchableOpacity
                    key={j}
                    className={btnClass}
                    onPress={() => handlePress(btn)}
                  >
                    <Text className={textClass}>{btn}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <TouchableOpacity
          className="bg-violet-600 rounded-xl p-4 flex-row items-center justify-center gap-2 shadow-sm"
          onPress={handleLancar}
          activeOpacity={0.8}
        >
          <Ionicons name="paper-plane-outline" size={20} color="#fff" />
          <Text className="text-white font-bold text-base">Lançar Resultado no Extrato</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function ChatFinanceiroIA({ tecladoAberto }: { tecladoAberto: boolean }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const scrollViewRef = useRef<{ scrollToEnd: (options?: { animated?: boolean }) => void } | null>(null);

  const {
    contexto,
    mensagens,
    enviando,
    enviarPergunta,
    limparConversa,
    recarregarContexto,
  } = useAssistenteFinanceiro();

  const [inputText, setInputText] = useState("");

  useFocusEffect(
    useCallback(() => {
      recarregarContexto();
    }, [recarregarContexto])
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [mensagens, enviando, tecladoAberto]);

  const handleSend = async () => {
    if (!inputText.trim() || enviando) return;
    const texto = inputText;
    setInputText("");
    Keyboard.dismiss();
    await enviarPergunta(texto);
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (enviando) return;
    const perguntaLimpa = prompt.replace(/^[^\wÀ-ÿ]+\s*/, "");
    await enviarPergunta(perguntaLimpa);
  };

  const proximoGastoFixo = contexto?.proximosGastosFixos?.find((f) => f.type === "expense");

  return (
    <View className="flex-1">
      {/* BARRA DE CONTEXTO CONECTADO AO SQLITE (Recolhe automaticamente ao abrir o teclado para liberar espaço visual) */}
      {!tecladoAberto && (
        <View className="mx-5 mb-2.5 bg-white dark:bg-[#090d16] rounded-2xl p-3.5 border border-violet-200/80 dark:border-violet-900/50 shadow-sm">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <Text className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">
                IA Conectada aos seus Dados
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => recarregarContexto(false)}
                className="flex-row items-center gap-1"
                accessibilityLabel="Atualizar dados financeiros"
              >
                <Ionicons
                  name="refresh"
                  size={15}
                  color={isDark ? "#c4b5fd" : "#7c3aed"}
                />
                <Text className="text-xs font-semibold text-violet-600 dark:text-violet-300">
                  Sincronizar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={limparConversa}
                className="flex-row items-center gap-1"
                accessibilityLabel="Limpar conversa"
              >
                <Ionicons
                  name="trash-outline"
                  size={15}
                  color={isDark ? "#94a3b8" : "#64748b"}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row justify-between gap-2">
            <View className="flex-1 bg-slate-50 dark:bg-[#05050A] rounded-xl p-2.5 border border-slate-200/70 dark:border-violet-950/80">
              <Text className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                Saldo Livre
              </Text>
              <Text
                className={`text-sm font-extrabold mt-0.5 ${
                  (contexto?.saldoLivre ?? 0) < 0
                    ? "text-orange-500 dark:text-orange-400"
                    : "text-violet-700 dark:text-violet-300"
                }`}
                numberOfLines={1}
              >
                {formatCurrency(contexto?.saldoLivre ?? 0)}
              </Text>
            </View>

            <View className="flex-1 bg-slate-50 dark:bg-[#05050A] rounded-xl p-2.5 border border-slate-200/70 dark:border-violet-950/80">
              <Text className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                Gastos Fixos
              </Text>
              <Text
                className="text-sm font-extrabold text-orange-600 dark:text-orange-400 mt-0.5"
                numberOfLines={1}
              >
                {formatCurrency(contexto?.totalDespesasFixas ?? 0)}
              </Text>
            </View>

            <View className="flex-1 bg-slate-50 dark:bg-[#05050A] rounded-xl p-2.5 border border-slate-200/70 dark:border-violet-950/80">
              <Text className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                Guardar (20%)
              </Text>
              <Text
                className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5"
                numberOfLines={1}
              >
                {formatCurrency(contexto?.sugestaoPoupar20 ?? 0)}
              </Text>
            </View>
          </View>

          {proximoGastoFixo && (
            <TouchableOpacity
              onPress={() => handleQuickPrompt("Quais são meus próximos gastos fixos?")}
              className="mt-2.5 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 rounded-xl px-3 py-2 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2 flex-1">
                <Ionicons
                  name="notifications"
                  size={15}
                  color={isDark ? "#c4b5fd" : "#7c3aed"}
                />
                <Text
                  className="text-xs font-semibold text-violet-900 dark:text-violet-200 flex-1"
                  numberOfLines={1}
                >
                  Próximo gasto fixo: {proximoGastoFixo.title} (
                  {formatCurrency(proximoGastoFixo.amount)}) •{" "}
                  {proximoGastoFixo.diasRestantes === 0
                    ? "Vence hoje!"
                    : `em ${proximoGastoFixo.diasRestantes} dia(s)`}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={isDark ? "#c4b5fd" : "#7c3aed"}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* LISTA DE MENSAGENS DO CHAT */}
      <ScrollView
        ref={(r) => {
          scrollViewRef.current = r as unknown as { scrollToEnd: (options?: { animated?: boolean }) => void } | null;
        }}
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 8, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {mensagens.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <View
              key={msg.id}
              className={`flex-row ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <View className="w-8 h-8 rounded-full bg-violet-600 items-center justify-center mr-2 mt-1 shadow-sm">
                  <MaterialCommunityIcons name="robot-outline" size={18} color="#fff" />
                </View>
              )}

              <View
                className={`max-w-[82%] rounded-2xl p-4 ${
                  isUser
                    ? "bg-violet-600 rounded-br-sm"
                    : "bg-white dark:bg-[#090d16] border border-violet-100 dark:border-violet-950/90 rounded-bl-sm shadow-sm"
                }`}
              >
                <FormattedMessageText
                  content={msg.content}
                  isUser={isUser}
                  isDark={isDark}
                />

                {!isUser && msg.source && (
                  <View className="flex-row items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-violet-950/70">
                    <Text className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                      {msg.source === "supabase-gemini"
                        ? "✨ Gemini Flash • Nuvem"
                        : "⚡ IA Financeira • Custo Zero"}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {enviando && (
          <View className="flex-row justify-start items-center gap-2 py-2">
            <View className="w-8 h-8 rounded-full bg-violet-600 items-center justify-center">
              <ActivityIndicator size="small" color="#fff" />
            </View>
            <View className="bg-white dark:bg-[#090d16] border border-violet-100 dark:border-violet-950 rounded-2xl px-4 py-3">
              <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Calculando e analisando seus dados...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* CHIPS DE PERGUNTAS RÁPIDAS */}
      {!tecladoAberto && (
        <View className="py-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {SUGESTOES_RAPIDAS.map((sugestao) => (
              <TouchableOpacity
                key={sugestao}
                onPress={() => handleQuickPrompt(sugestao)}
                disabled={enviando}
                className="bg-violet-50 dark:bg-[#090d16] border border-violet-200 dark:border-violet-800/70 rounded-full px-3.5 py-2"
                activeOpacity={0.75}
              >
                <Text className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                  {sugestao}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* BARRA DE DIGITAÇÃO (Multiline + Elevação garantida acima do teclado) */}
      <View className="px-5 pb-3 pt-1.5 bg-slate-50 dark:bg-[#05050A]">
        <View className="flex-row items-end bg-white dark:bg-[#090d16] rounded-2xl px-3.5 py-2 border border-violet-300 dark:border-violet-700/80 shadow-sm gap-2">
          <TextInput
            className="flex-1 text-sm text-slate-900 dark:text-slate-100 py-1.5 max-h-28"
            placeholder="Pergunte sobre Uber, investimentos, gastos ou planos..."
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            value={inputText}
            onChangeText={setInputText}
            multiline
            textAlignVertical="center"
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || enviando}
            className={`w-10 h-10 rounded-xl items-center justify-center mb-0.5 ${
              !inputText.trim() || enviando
                ? "bg-slate-200 dark:bg-slate-800"
                : "bg-violet-600"
            }`}
          >
            <Ionicons
              name="send"
              size={18}
              color={!inputText.trim() || enviando ? "#94a3b8" : "#ffffff"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function CalculadorasScreen() {
  const [tabAtiva, setTabAtiva] = useState<"chat" | "tradicional">("chat");
  const [alturaTeclado, setAlturaTeclado] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const subShow = Keyboard.addListener(showEvent, (e) => {
      setAlturaTeclado(e.endCoordinates.height);
    });
    const subHide = Keyboard.addListener(hideEvent, () => {
      setAlturaTeclado(0);
    });

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const tecladoAberto = alturaTeclado > 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#05050A]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={
          Platform.OS === "android" && tecladoAberto
            ? { paddingBottom: Math.max(0, alturaTeclado - 20) }
            : undefined
        }
      >
        <View className="px-5 pt-2 pb-2">
          <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Consultor & Cálculo 🤖
          </Text>
          {!tecladoAberto && (
            <Text className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Inteligência financeira com acesso aos seus lançamentos
            </Text>
          )}
        </View>

        <View className="flex-row mx-5 bg-white dark:bg-[#090d16] rounded-xl p-1 border border-violet-200 dark:border-violet-950/90 mb-2.5 shadow-sm">
          <TouchableOpacity
            className={`flex-1 py-2 flex-row items-center justify-center gap-1.5 rounded-lg ${
              tabAtiva === "chat" ? "bg-violet-600" : ""
            }`}
            onPress={() => setTabAtiva("chat")}
          >
            <Ionicons
              name="sparkles"
              size={15}
              color={tabAtiva === "chat" ? "#ffffff" : "#64748b"}
            />
            <Text
              className={`text-sm font-bold ${
                tabAtiva === "chat"
                  ? "text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Chat IA
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-2 flex-row items-center justify-center gap-1.5 rounded-lg ${
              tabAtiva === "tradicional" ? "bg-violet-600" : ""
            }`}
            onPress={() => setTabAtiva("tradicional")}
          >
            <Ionicons
              name="calculator-outline"
              size={16}
              color={tabAtiva === "tradicional" ? "#ffffff" : "#64748b"}
            />
            <Text
              className={`text-sm font-bold ${
                tabAtiva === "tradicional"
                  ? "text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Tradicional
            </Text>
          </TouchableOpacity>
        </View>

        {tabAtiva === "chat" ? (
          <ChatFinanceiroIA tecladoAberto={tecladoAberto} />
        ) : (
          <CalculadoraTradicional />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
