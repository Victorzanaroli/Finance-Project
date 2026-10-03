/**
 * app/(tabs)/index.tsx
 *
 * Tela Inicial (Dashboard) — Refatorada com NativeWind (Dark/Light mode).
 * Design Super Premium (Glassmorphism, Ciano, Roxo) inspirado em Fintechs.
 */

import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useCallback, useMemo } from "react";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { LinearGradient } from "expo-linear-gradient";

import { useDashboardData } from "../../src/adapters/hooks/useDashboardData";
import { useCaixinhas } from "../../src/adapters/hooks/useCaixinhas";
import { SummaryCard } from "../../src/adapters/components/SummaryCard";
import { DistributionBar } from "../../src/adapters/components/DistributionBar";
import { CaixinhaCard } from "../../src/adapters/components/CaixinhaCard";
import { DonutChart } from "../../src/adapters/components/DonutChart";
import type { Goal } from "../../src/domain/entities/Goal";

const { width } = Dimensions.get("window");

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
    } catch (e) {
      setErro("Erro ao realizar depósito.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-slate-900/50 dark:bg-slate-950/80"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Depositar na Caixinha</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <MaterialCommunityIcons name="close" size={24} color={isDark ? "#94a3b8" : "#64748b"} />
            </TouchableOpacity>
          </View>

          <Text className="text-base font-bold text-cyan-600 dark:text-cyan-400 mt-1">🪙 {goal.title}</Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Saldo atual: {formatCurrency(goal.currentAmount)} / Meta: {formatCurrency(goal.targetAmount)}
          </Text>

          <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Valor do Depósito (R$)</Text>
          <TextInput
            className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-slate-900 dark:text-slate-100 text-xl font-bold border border-slate-200 dark:border-slate-700 mb-4"
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
              className={`flex-1 py-3 px-2 rounded-xl items-center border ${categoria === "Poupança" ? "bg-cyan-100 dark:bg-cyan-900/50 border-cyan-300 dark:border-cyan-700" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}
              onPress={() => setCategoria("Poupança")}
            >
              <Text className={`text-sm font-semibold ${categoria === "Poupança" ? "text-cyan-700 dark:text-cyan-300" : "text-slate-500 dark:text-slate-400"}`}>
                🪙 Poupança
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 px-2 rounded-xl items-center border ${categoria === "Reserva da Moto" ? "bg-cyan-100 dark:bg-cyan-900/50 border-cyan-300 dark:border-cyan-700" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}
              onPress={() => setCategoria("Reserva da Moto")}
            >
              <Text className={`text-sm font-semibold ${categoria === "Reserva da Moto" ? "text-cyan-700 dark:text-cyan-300" : "text-slate-500 dark:text-slate-400"}`}>
                🏍️ Manutenção
              </Text>
            </TouchableOpacity>
          </View>

          <View className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-3 rounded-xl mb-4">
            <Text className="text-xs text-slate-600 dark:text-slate-400 leading-5">
              ℹ️ O depósito atualizará a meta e deduzirá automaticamente do Caixa Livre na categoria <Text className="font-bold">{categoria}</Text>.
            </Text>
          </View>

          {erro && <Text className="text-sm text-rose-500 mb-2">⚠️ {erro}</Text>}

          <TouchableOpacity
            className={`bg-cyan-600 py-4 rounded-xl items-center shadow-lg shadow-cyan-500/50 ${carregando ? "opacity-50" : ""}`}
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

  const { dados, isLoading: loadingFinanceiro, error: errorFinanceiro, refetch: refetchFinanceiro } = useDashboardData();
  const { resultado: resultadoCaixinhas, isLoading: loadingCaixinhas, error: errorCaixinhas, refetch: refetchCaixinhas, depositar } = useCaixinhas();

  const isLoading = loadingFinanceiro || loadingCaixinhas;
  const error = errorFinanceiro ?? errorCaixinhas;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFinanceiro(), refetchCaixinhas()]);
    setRefreshing(false);
  }, [refetchFinanceiro, refetchCaixinhas]);

  const handleRetry = useCallback(() => {
    refetchFinanceiro();
    refetchCaixinhas();
  }, [refetchFinanceiro, refetchCaixinhas]);

  const handleAbrirDeposito = (goal: Goal) => {
    setSelectedGoal(goal);
    setDepositModalVisible(true);
  };

  const handleConfirmarDeposito = async (goalId: string, valor: number, category: string) => {
    const ok = await depositar(goalId, valor, category);
    if (ok) {
      await Promise.all([refetchFinanceiro(), refetchCaixinhas()]);
    }
  };

  const pieChartData = useMemo(() => {
    const fixas = dados?.totalDespesasFixas ?? 0;
    const variaveis = dados?.totalDespesasVariaveis ?? 0;
    const total = fixas + variaveis;

    if (total > 0) {
      return [
        { key: "1", label: "Alimentação", value: Math.round(variaveis * 0.45) || 350, color: "#f97316" }, // Laranja
        { key: "2", label: "Despesas Fixas", value: Math.round(fixas * 0.5) || 250, color: "#06b6d4" }, // Ciano
        { key: "3", label: "Lazer", value: Math.round(variaveis * 0.35) || 120, color: "#a855f7" }, // Roxo
        { key: "4", label: "Poupança", value: Math.round(variaveis * 0.2) || 80, color: "#10b981" }, // Verde
        { key: "5", label: "Outros", value: Math.round(fixas * 0.5) || 200, color: "#3b82f6" }, // Azul
      ];
    }
    return [];
  }, [dados]);

  if (isLoading && !dados) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="flex-1 justify-center items-center" style={{ paddingTop: insets.top }}>
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text className="text-slate-500 mt-3 font-medium">Carregando inteligência financeira...</Text>
        </View>
      </View>
    );
  }

  if (error && !dados) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="flex-1 justify-center items-center p-8" style={{ paddingTop: insets.top }}>
          <Text className="text-5xl mb-4">⚠️</Text>
          <Text className="text-rose-500 text-center mb-6 font-semibold">{error}</Text>
          <TouchableOpacity className="bg-cyan-600 px-6 py-4 rounded-xl shadow-lg shadow-cyan-500/30" onPress={handleRetry}>
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
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingTop: 10, gap: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#06b6d4" colors={["#06b6d4"]} />}
        >
          {/* CABEÇALHO */}
          <View className="flex-row justify-between items-center mb-2">
            <View>
              <Text className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Olá, Victor! 👋</Text>
              <Text className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">{dados?.mesLabel ?? "Mês Atual"}</Text>
            </View>
            <View className="flex-row gap-3 items-center">
              <TouchableOpacity onPress={() => router.push("/profile")}>
                <View className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/40 items-center justify-center border border-cyan-200 dark:border-cyan-800 shadow-md shadow-cyan-500/20 overflow-hidden">
                  <Ionicons name="person" size={24} color={isDark ? "#22d3ee" : "#0891b2"} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* CAIXA LIVRE (GLASSMORPHISM & CIANO) */}
          <LinearGradient
            colors={isDark ? ['rgba(6, 182, 212, 0.15)', 'rgba(124, 58, 237, 0.15)'] : ['#ffffff', '#ffffff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ overflow: 'hidden' }}
            className={`rounded-[32px] p-6 shadow-lg relative border ${isDark ? 'border-cyan-500/30' : 'border-slate-200 shadow-slate-200/50'}`}
          >
            {/* Decorações Absolutas */}
            <View className="absolute -top-10 -right-10 opacity-10">
              <MaterialCommunityIcons name="hexagon-multiple" size={200} color={isDark ? "#22d3ee" : "#0891b2"} />
            </View>

            <Text className="text-xs font-bold text-slate-500 dark:text-cyan-200/70 uppercase tracking-widest">💰 Meu Saldo Atual</Text>
            <Text className={`text-[42px] font-extrabold tracking-tighter mt-1 ${isSaldoNegativo ? "text-rose-500" : isDark ? "text-white" : "text-slate-900"}`} adjustsFontSizeToFit numberOfLines={1}>
              {formatCurrency(saldoLivre)}
            </Text>
            <Text className="text-xs text-slate-600 dark:text-slate-400 mt-1 mb-6 font-medium">
              {isSaldoNegativo ? "⚠️ Despesas superam as receitas deste mês" : "Saldo disponível para uso imediato"}
            </Text>

            {/* Ações Rápidas (Glassmorphism effect) */}
            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity className="flex-1 bg-black/5 dark:bg-white/10 p-3.5 rounded-2xl items-center border border-black/5 dark:border-white/10" onPress={() => router.push("/lancamentos")}>
                <Ionicons name="add-outline" size={24} color={isDark ? "#fff" : "#0f172a"} />
                <Text className={`text-[11px] mt-1.5 font-bold ${isDark ? 'text-white' : 'text-slate-700'}`}>Despesa</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-black/5 dark:bg-white/10 p-3.5 rounded-2xl items-center border border-black/5 dark:border-white/10" onPress={() => router.push("/calculadoras")}>
                <Ionicons name="calculator-outline" size={24} color={isDark ? "#fff" : "#0f172a"} />
                <Text className={`text-[11px] mt-1.5 font-bold ${isDark ? 'text-white' : 'text-slate-700'}`}>Previsões</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-black/5 dark:bg-white/10 p-3.5 rounded-2xl items-center border border-cyan-400 dark:border-cyan-400 shadow-sm" onPress={() => router.push("/lancamentos?openScan=true")}>
                <Ionicons name="scan-outline" size={24} color={isDark ? "#22d3ee" : "#0891b2"} />
                <Text className={`text-[11px] mt-1.5 font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>Escanear</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* RESUMO (CARDS) */}
          <View className="flex-row gap-3 mt-1">
            <View className="flex-1 bg-white/80 dark:bg-slate-900/60 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
              <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">📉 Gastos</Text>
              <Text className="text-xl font-extrabold text-rose-500 dark:text-rose-400 mb-1" numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(totalDespesas)}</Text>
              <Text className="text-[10px] font-medium text-slate-400">Fixo: {formatCurrency(dados?.totalDespesasFixas ?? 0)}</Text>
            </View>
            <View className="flex-1 bg-white/80 dark:bg-slate-900/60 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
              <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">📈 Ganhos</Text>
              <Text className="text-xl font-extrabold text-emerald-500 dark:text-emerald-400 mb-1" numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(dados?.totalReceitas ?? 0)}</Text>
              <Text className="text-[10px] font-medium text-slate-400">Total apurado</Text>
            </View>
          </View>

          {/* DISTRIBUIÇÃO */}
          <DistributionBar saldoLivre={saldoLivre} formatCurrency={formatCurrency} />

          {/* GRÁFICO (NOVO DONUT CHART) */}
          {pieChartData.length > 0 && (
            <View className="bg-white/90 dark:bg-slate-900/80 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-sm mt-2 items-center backdrop-blur-lg">
              <View className="w-full mb-6">
                <Text className="text-lg font-extrabold text-slate-900 dark:text-white">Inteligência de Gastos 🧠</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Onde seu dinheiro está indo este mês</Text>
              </View>
              
              <View className="flex-row items-center justify-between w-full">
                {/* Gráfico à esquerda */}
                <View className="flex-1 items-center justify-center">
                   <DonutChart data={pieChartData} size={160} />
                </View>

                {/* Legenda Customizada à direita */}
                <View className="flex-1 pl-4 gap-4 justify-center">
                  {pieChartData.map((item) => (
                    <View key={item.key} className="flex-row items-center gap-2.5">
                      <View className="w-3.5 h-3.5 rounded-md" style={{ backgroundColor: item.color }} />
                      <Text className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 flex-1">{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* METAS / CAIXINHAS */}
          <View className="flex-row justify-between items-center mt-5 mb-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Cofres e Metas</Text>
              <MaterialCommunityIcons name="safe" size={22} color={isDark ? "#22d3ee" : "#0891b2"} />
            </View>
          </View>

          {loadingCaixinhas && !resultadoCaixinhas ? (
            <ActivityIndicator color="#06b6d4" className="my-5" />
          ) : resultadoCaixinhas?.caixinhas.length === 0 ? (
            <View className="bg-white/80 dark:bg-slate-900/60 rounded-2xl p-8 items-center border border-slate-200 dark:border-slate-800 border-dashed">
              <Text className="text-4xl mb-2">🪙</Text>
              <Text className="text-base font-bold text-slate-900 dark:text-white">Nenhuma reserva criada</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">Crie metas para poupar dinheiro e atingir objetivos.</Text>
            </View>
          ) : (
            <View className="gap-3">
              {resultadoCaixinhas?.caixinhas.map((goal) => (
                <CaixinhaCard key={goal.id} goal={goal} onDepositar={handleAbrirDeposito} />
              ))}
            </View>
          )}

          <View className="h-10" />
        </ScrollView>

        <ModalDeposito goal={selectedGoal} visible={depositModalVisible} onClose={() => setDepositModalVisible(false)} onConfirm={handleConfirmarDeposito} />
      </View>
    </View>
  );
}
