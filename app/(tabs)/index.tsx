/**
 * app/(tabs)/index.tsx
 *
 * Tela Inicial (Dashboard) — Tema Preto & Roxo (Dark) / Branco & Roxo (Light).
 * Harmonia cromática triádica:
 *  - Identidade & Poupança: Roxo/Violeta (#7c3aed / #8b5cf6 / #a78bfa)
 *  - Receitas / Positivo: Verde Esmeralda (#10b981 / #34d399)
 *  - Despesas / Saídas: Coral-Âmbar Quente (#fb923c / #ea580c) — substitui o vermelho-choque
 *    que brigava visualmente com o roxo em fundos escuros.
 */

import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useCallback, useMemo } from "react";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { LinearGradient } from "expo-linear-gradient";

import { useDashboardData } from "../../src/adapters/hooks/useDashboardData";
import { useCaixinhas } from "../../src/adapters/hooks/useCaixinhas";
import { useUserAccount } from "../../src/adapters/hooks/useUserAccount";
import { DistributionBar } from "../../src/adapters/components/DistributionBar";
import { CaixinhaCard } from "../../src/adapters/components/CaixinhaCard";
import { DonutChart } from "../../src/adapters/components/DonutChart";
import type { Goal } from "../../src/domain/entities/Goal";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

interface ModalDepositoProps {
  goal: Goal | null;
  visible: boolean;
  onClose: () => void;
  onConfirm: (goalId: string, valor: number, category: string) => Promise<void>;
}

function ModalDeposito({ goal, visible, onClose, onConfirm }: ModalDepositoProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [valorText, setValorText] = useState("");
  const [categoria, setCategoria] = useState("Poupança");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!goal) return null;

  async function handleConfirmar() {
    setErro(null);
    const parsed = parseFloat(valorText.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      setErro("Informe um valor válido maior que zero.");
      return;
    }

    setCarregando(true);
    try {
      await onConfirm(goal!.id, parsed, categoria);
      setValorText("");
      onClose();
    } catch {
      setErro("Erro ao realizar depósito.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/60 dark:bg-black/80"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="bg-white dark:bg-[#090d16] rounded-t-3xl p-6 border-t border-violet-200 dark:border-violet-900/60">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Depositar na Caixinha</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <MaterialCommunityIcons name="close" size={24} color={isDark ? "#94a3b8" : "#64748b"} />
            </TouchableOpacity>
          </View>

          <Text className="text-base font-bold text-violet-600 dark:text-violet-400 mt-1">🪙 {goal.title}</Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Saldo atual: {formatCurrency(goal.currentAmount)} / Meta: {formatCurrency(goal.targetAmount)}
          </Text>

          <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Valor do Depósito (R$)</Text>
          <TextInput
            className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-slate-900 dark:text-slate-100 text-xl font-bold border border-violet-200 dark:border-violet-800/60 mb-4"
            value={valorText}
            onChangeText={setValorText}
            placeholder="0.00"
            placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
            keyboardType="decimal-pad"
            autoFocus
          />

          <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Categoria para Lançamento</Text>
          <View className="flex-row gap-2 mb-4">
            <TouchableOpacity
              className={`flex-1 py-3 px-2 rounded-xl items-center border ${
                categoria === "Poupança"
                  ? "bg-violet-100 dark:bg-violet-950/80 border-violet-400 dark:border-violet-600"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              }`}
              onPress={() => setCategoria("Poupança")}
            >
              <Text
                className={`text-sm font-semibold ${
                  categoria === "Poupança"
                    ? "text-violet-700 dark:text-violet-300"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                🪙 Poupança
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 px-2 rounded-xl items-center border ${
                categoria === "Reserva da Moto"
                  ? "bg-violet-100 dark:bg-violet-950/80 border-violet-400 dark:border-violet-600"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              }`}
              onPress={() => setCategoria("Reserva da Moto")}
            >
              <Text
                className={`text-sm font-semibold ${
                  categoria === "Reserva da Moto"
                    ? "text-violet-700 dark:text-violet-300"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                🏍️ Manutenção
              </Text>
            </TouchableOpacity>
          </View>

          <View className="bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-900/50 p-3 rounded-xl mb-4">
            <Text className="text-xs text-slate-600 dark:text-slate-400 leading-5">
              ℹ️ O depósito atualizará a meta e deduzirá automaticamente do Caixa Livre na categoria <Text className="font-bold text-violet-700 dark:text-violet-300">{categoria}</Text>.
            </Text>
          </View>

          {erro && <Text className="text-sm text-orange-500 dark:text-orange-400 mb-2">⚠️ {erro}</Text>}

          <TouchableOpacity
            className={`bg-violet-600 py-4 rounded-xl items-center shadow-lg shadow-violet-500/40 ${carregando ? "opacity-50" : ""}`}
            onPress={handleConfirmar}
            disabled={carregando}
          >
            {carregando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">✓ Confirmar Depósito</Text>
            )}
          </TouchableOpacity>
          <View className="h-6" />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [novaMetaModalVisible, setNovaMetaModalVisible] = useState(false);
  const [novoTituloMeta, setNovoTituloMeta] = useState("");
  const [novoValorMeta, setNovoValorMeta] = useState("");

  const { user, recarregarUsuario } = useUserAccount();
  const { dados, isLoading: loadingFinanceiro, error: errorFinanceiro, refetch: refetchFinanceiro } = useDashboardData();
  const {
    resultado: resultadoCaixinhas,
    isLoading: loadingCaixinhas,
    error: errorCaixinhas,
    refetch: refetchCaixinhas,
    depositar,
    criarCaixinha,
    excluirCaixinha,
  } = useCaixinhas();

  useFocusEffect(
    useCallback(() => {
      refetchFinanceiro();
      refetchCaixinhas();
      recarregarUsuario();
    }, [refetchFinanceiro, refetchCaixinhas, recarregarUsuario])
  );

  const isLoading = loadingFinanceiro || loadingCaixinhas;
  const error = errorFinanceiro ?? errorCaixinhas;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFinanceiro(), refetchCaixinhas(), recarregarUsuario()]);
    setRefreshing(false);
  }, [refetchFinanceiro, refetchCaixinhas, recarregarUsuario]);

  const handleRetry = useCallback(() => {
    refetchFinanceiro();
    refetchCaixinhas();
  }, [refetchFinanceiro, refetchCaixinhas]);

  const handleAbrirDeposito = (goal: Goal) => {
    setSelectedGoal(goal);
    setDepositModalVisible(true);
  };

  const handleExcluirCaixinha = (goal: Goal) => {
    Alert.alert(
      "Excluir Meta",
      `Tem certeza que deseja excluir a meta "${goal.title}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await excluirCaixinha(goal.id);
            await refetchFinanceiro();
          },
        },
      ]
    );
  };

  const handleConfirmarDeposito = async (goalId: string, valor: number, category: string) => {
    const ok = await depositar(goalId, valor, category);
    if (ok) {
      await Promise.all([refetchFinanceiro(), refetchCaixinhas()]);
    }
  };

  const pieChartData = useMemo(() => {
    const categoriasReais = dados?.despesasPorCategoria ?? [];
    // Paleta harmônica: Violeta, Esmeralda, Coral Suave, Lavanda, Âmbar
    const palette = ["#8b5cf6", "#10b981", "#fb923c", "#a855f7", "#f59e0b", "#6366f1"];

    if (categoriasReais.length > 0) {
      return categoriasReais.slice(0, 5).map((item, idx) => ({
        key: String(idx + 1),
        label: item.categoria,
        value: item.total,
        color: palette[idx % palette.length],
      }));
    }
    return [];
  }, [dados]);

  if (isLoading && !dados) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-[#05050A]">
        <View className="flex-1 justify-center items-center" style={{ paddingTop: insets.top }}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text className="text-slate-500 mt-3 font-medium">Carregando inteligência financeira...</Text>
        </View>
      </View>
    );
  }

  if (error && !dados) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-[#05050A]">
        <View className="flex-1 justify-center items-center p-8" style={{ paddingTop: insets.top }}>
          <Text className="text-5xl mb-4">⚠️</Text>
          <Text className="text-orange-500 dark:text-orange-400 text-center mb-6 font-semibold">{error}</Text>
          <TouchableOpacity className="bg-violet-600 px-6 py-4 rounded-xl shadow-lg shadow-violet-500/30" onPress={handleRetry}>
            <Text className="text-white font-bold">Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totalDespesas = dados?.totalDespesas ?? 0;
  const saldoLivre = dados?.saldoLivre ?? 0;
  const isSaldoNegativo = saldoLivre < 0;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#05050A]">
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingTop: 10, gap: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#8b5cf6"
              colors={["#8b5cf6"]}
            />
          }
        >
          {/* CABEÇALHO */}
          <View className="flex-row justify-between items-center mb-2">
            <View>
              <Text className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Olá, {user?.name || "Victor"}! 👋
              </Text>
              <Text className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
                {dados?.mesLabel ?? "Mês Atual"}
              </Text>
            </View>
            <View className="flex-row gap-3 items-center">
              <TouchableOpacity onPress={() => router.push("/profile")}>
                <View className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-950/70 items-center justify-center border border-violet-300 dark:border-violet-700/70 shadow-md shadow-violet-500/20 overflow-hidden">
                  {user?.avatarUri ? (
                    <Image source={{ uri: user.avatarUri }} className="w-12 h-12 rounded-full" />
                  ) : (
                    <Ionicons name="person" size={24} color={isDark ? "#c4b5fd" : "#7c3aed"} />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* CAIXA LIVRE (GLASSMORPHISM PRETO & ROXO / VIOLETA) */}
          <LinearGradient
            colors={
              isDark
                ? ["rgba(124, 58, 237, 0.28)", "rgba(76, 29, 149, 0.14)"]
                : ["#f5f3ff", "#ffffff"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ overflow: "hidden" }}
            className={`rounded-[32px] p-6 shadow-lg relative border ${
              isDark ? "border-violet-500/35" : "border-violet-200 shadow-violet-200/50"
            }`}
          >
            {/* Decorações Absolutas */}
            <View className="absolute -top-10 -right-10 opacity-10">
              <MaterialCommunityIcons
                name="hexagon-multiple"
                size={200}
                color={isDark ? "#a78bfa" : "#7c3aed"}
              />
            </View>

            <Text className="text-xs font-bold text-violet-700 dark:text-violet-300/90 uppercase tracking-widest">
              💰 Meu Saldo Atual
            </Text>
            <Text
              className={`text-[42px] font-extrabold tracking-tighter mt-1 ${
                isSaldoNegativo
                  ? "text-orange-500 dark:text-orange-400"
                  : isDark
                  ? "text-white"
                  : "text-slate-900"
              }`}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {formatCurrency(saldoLivre)}
            </Text>
            <Text className="text-xs text-slate-600 dark:text-slate-400 mt-1 mb-6 font-medium">
              {isSaldoNegativo
                ? "⚠️ Despesas superam as receitas deste mês"
                : "Saldo disponível para uso imediato"}
            </Text>

            {/* Ações Rápidas (Glassmorphism Roxo) */}
            <View className="flex-row gap-2 mt-2">
              <TouchableOpacity
                className="flex-1 bg-violet-600/10 dark:bg-white/10 p-3 rounded-2xl items-center border border-violet-200/70 dark:border-white/10"
                onPress={() => router.push("/lancamentos")}
              >
                <Ionicons name="add-outline" size={22} color={isDark ? "#fff" : "#6d28d9"} />
                <Text
                  className={`text-[10px] mt-1.5 font-bold ${
                    isDark ? "text-white" : "text-violet-950"
                  }`}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Despesa
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-violet-600/10 dark:bg-white/10 p-3 rounded-2xl items-center border border-violet-200/70 dark:border-white/10"
                onPress={() => router.push("/calculadoras")}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={22}
                  color={isDark ? "#c4b5fd" : "#7c3aed"}
                />
                <Text
                  className={`text-[10px] mt-1.5 font-bold ${
                    isDark ? "text-violet-300" : "text-violet-700"
                  }`}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Chat IA
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-violet-600/10 dark:bg-white/10 p-3 rounded-2xl items-center border border-violet-200/70 dark:border-white/10"
                onPress={() => router.push("/shopping-list")}
              >
                <Ionicons name="cart-outline" size={22} color={isDark ? "#fff" : "#6d28d9"} />
                <Text
                  className={`text-[10px] mt-1.5 font-bold ${
                    isDark ? "text-white" : "text-violet-950"
                  }`}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Compras
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-violet-600/15 dark:bg-violet-500/20 p-3 rounded-2xl items-center border border-violet-500 dark:border-violet-400 shadow-sm"
                onPress={() => router.push("/lancamentos?openScan=true")}
              >
                <Ionicons name="scan-outline" size={22} color={isDark ? "#c4b5fd" : "#7c3aed"} />
                <Text
                  className={`text-[10px] mt-1.5 font-bold ${
                    isDark ? "text-violet-200" : "text-violet-700"
                  }`}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Escanear
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* RESUMO (CARDS: SAÍDAS EM CORAL/ÂMBAR QUENTE & ENTRADAS EM ESMERALDA) */}
          <View className="flex-row gap-3 mt-1">
            <View className="flex-1 bg-white/90 dark:bg-[#090d16] rounded-3xl p-5 border border-violet-100 dark:border-violet-950/80 shadow-sm">
              <View className="flex-row items-center gap-1.5 mb-2">
                <View className="w-2 h-2 rounded-full bg-orange-400" />
                <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Saídas
                </Text>
              </View>
              <Text
                className="text-xl font-extrabold text-orange-600 dark:text-orange-400 mb-1"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(totalDespesas)}
              </Text>
              <Text className="text-[10px] font-medium text-slate-400">
                Fixo: {formatCurrency(dados?.totalDespesasFixas ?? 0)}
              </Text>
            </View>

            <View className="flex-1 bg-white/90 dark:bg-[#090d16] rounded-3xl p-5 border border-violet-100 dark:border-violet-950/80 shadow-sm">
              <View className="flex-row items-center gap-1.5 mb-2">
                <View className="w-2 h-2 rounded-full bg-emerald-400" />
                <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Ganhos
                </Text>
              </View>
              <Text
                className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-1"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(dados?.totalReceitas ?? 0)}
              </Text>
              <Text className="text-[10px] font-medium text-slate-400">Total apurado</Text>
            </View>
          </View>

          {/* DISTRIBUIÇÃO */}
          <DistributionBar saldoLivre={saldoLivre} formatCurrency={formatCurrency} />

          {/* AVISOS DE PRÓXIMOS GASTOS FIXOS */}
          {(dados?.proximosGastosFixos?.length ?? 0) > 0 && (
            <View className="bg-white/90 dark:bg-[#090d16] rounded-3xl p-5 border border-violet-200/80 dark:border-violet-900/50 shadow-sm mt-1">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2.5">
                  <View className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950 items-center justify-center">
                    <Ionicons
                      name="notifications"
                      size={18}
                      color={isDark ? "#c4b5fd" : "#7c3aed"}
                    />
                  </View>
                  <View>
                    <Text className="text-base font-extrabold text-slate-900 dark:text-white">
                      Próximos Gastos Fixos
                    </Text>
                    <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                      Lembretes automáticos das suas contas recorrentes
                    </Text>
                  </View>
                </View>
              </View>

              <View className="gap-2.5">
                {dados?.proximosGastosFixos.slice(0, 4).map((fixo) => {
                  const isUrgente = fixo.diasRestantes <= 5;
                  return (
                    <View
                      key={fixo.id}
                      className={`flex-row items-center justify-between p-3.5 rounded-2xl border ${
                        isUrgente
                          ? "bg-amber-50/80 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800/60"
                          : "bg-slate-50 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800"
                      }`}
                    >
                      <View className="flex-1 pr-2">
                        <Text
                          className="text-sm font-bold text-slate-900 dark:text-slate-100"
                          numberOfLines={1}
                        >
                          {fixo.title}
                        </Text>
                        <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {fixo.descricaoRecorrencia} • {fixo.category}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          className={`text-sm font-extrabold ${
                            fixo.type === "expense"
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {fixo.type === "expense" ? "-" : "+"} {formatCurrency(fixo.amount)}
                        </Text>
                        <Text
                          className={`text-[11px] font-bold mt-0.5 ${
                            fixo.diasRestantes === 0
                              ? "text-orange-600 dark:text-orange-400"
                              : isUrgente
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-violet-600 dark:text-violet-400"
                          }`}
                        >
                          {fixo.diasRestantes === 0
                            ? "🔔 Vence hoje!"
                            : `Em ${fixo.diasRestantes} dia(s)`}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* GRÁFICO (DONUT CHART) */}
          {pieChartData.length > 0 && (
            <View className="bg-white/90 dark:bg-[#090d16] rounded-3xl p-6 border border-violet-100 dark:border-violet-950/80 shadow-sm mt-2 items-center">
              <View className="w-full mb-6">
                <Text className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Inteligência de Gastos 🧠
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Onde seu dinheiro está indo este mês
                </Text>
              </View>

              <View className="flex-row items-center justify-between w-full">
                <View className="flex-1 items-center justify-center">
                  <DonutChart data={pieChartData} size={160} />
                </View>

                <View className="flex-1 pl-4 gap-4 justify-center">
                  {pieChartData.map((item) => (
                    <View key={item.key} className="flex-row items-center gap-2.5">
                      <View
                        className="w-3.5 h-3.5 rounded-md"
                        style={{ backgroundColor: item.color }}
                      />
                      <Text className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 flex-1">
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* METAS / CAIXINHAS */}
          <View className="flex-row justify-between items-center mt-5 mb-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                Cofres e Metas
              </Text>
              <MaterialCommunityIcons
                name="safe"
                size={22}
                color={isDark ? "#a78bfa" : "#7c3aed"}
              />
            </View>
            <TouchableOpacity
              onPress={() => setNovaMetaModalVisible(true)}
              className="bg-violet-100 dark:bg-violet-950/80 border border-violet-300 dark:border-violet-700/70 px-3 py-1.5 rounded-xl flex-row items-center gap-1"
            >
              <Ionicons name="add" size={16} color={isDark ? "#c4b5fd" : "#7c3aed"} />
              <Text className="text-xs font-bold text-violet-700 dark:text-violet-300">
                Nova Meta
              </Text>
            </TouchableOpacity>
          </View>

          {loadingCaixinhas && !resultadoCaixinhas ? (
            <ActivityIndicator color="#8b5cf6" className="my-5" />
          ) : resultadoCaixinhas?.caixinhas.length === 0 ? (
            <View className="bg-white/80 dark:bg-[#090d16] rounded-2xl p-8 items-center border border-violet-200 dark:border-violet-950 border-dashed">
              <Text className="text-4xl mb-2">🪙</Text>
              <Text className="text-base font-bold text-slate-900 dark:text-white">
                Nenhuma reserva criada
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
                Crie metas para poupar dinheiro e atingir objetivos.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {resultadoCaixinhas?.caixinhas.map((goal) => (
                <CaixinhaCard
                  key={goal.id}
                  goal={goal}
                  onDepositar={handleAbrirDeposito}
                  onExcluir={handleExcluirCaixinha}
                />
              ))}
            </View>
          )}

          <View className="h-10" />
        </ScrollView>

        <ModalDeposito
          goal={selectedGoal}
          visible={depositModalVisible}
          onClose={() => setDepositModalVisible(false)}
          onConfirm={handleConfirmarDeposito}
        />

        {/* Modal Nova Meta / Caixinha */}
        <Modal
          visible={novaMetaModalVisible}
          animationType="slide"
          transparent
          presentationStyle="overFullScreen"
        >
          <KeyboardAvoidingView
            className="flex-1 justify-end bg-black/70"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View className="bg-white dark:bg-[#090d16] rounded-t-3xl p-6 border-t border-violet-200 dark:border-violet-900/60">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Criar Nova Meta 🎯
                </Text>
                <TouchableOpacity onPress={() => setNovaMetaModalVisible(false)} className="p-1">
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={isDark ? "#94a3b8" : "#64748b"}
                  />
                </TouchableOpacity>
              </View>

              <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Nome da Caixinha / Objetivo
              </Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-slate-900 dark:text-slate-100 font-semibold border border-violet-200 dark:border-violet-800/60 mb-4"
                value={novoTituloMeta}
                onChangeText={setNovoTituloMeta}
                placeholder="Ex: Viagem, Reserva de Emergência, Notebook..."
                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
              />

              <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Valor da Meta (R$)
              </Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-slate-900 dark:text-slate-100 text-lg font-bold border border-violet-200 dark:border-violet-800/60 mb-6"
                value={novoValorMeta}
                onChangeText={setNovoValorMeta}
                placeholder="1000.00"
                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                keyboardType="decimal-pad"
              />

              <TouchableOpacity
                className="bg-violet-600 py-4 rounded-xl items-center shadow-lg shadow-violet-500/40"
                onPress={async () => {
                  const valor = parseFloat(novoValorMeta.replace(",", "."));
                  if (!novoTituloMeta.trim() || Number.isNaN(valor) || valor <= 0) return;
                  const ok = await criarCaixinha(novoTituloMeta.trim(), valor, "#8b5cf6");
                  if (ok) {
                    setNovoTituloMeta("");
                    setNovoValorMeta("");
                    setNovaMetaModalVisible(false);
                    await refetchFinanceiro();
                  }
                }}
              >
                <Text className="text-white font-bold text-base">✓ Criar Caixinha</Text>
              </TouchableOpacity>
              <View className="h-6" />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </View>
  );
}
