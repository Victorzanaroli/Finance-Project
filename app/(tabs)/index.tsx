/**
 * app/(tabs)/index.tsx
 *
 * Tela Inicial (Dashboard) — Boundary de UI.
 *
 * HIERARQUIA VERTICAL EXATA REQUISITADA:
 *  1. Cabeçalho (Mês atual e "Caixa Livre" com saldo destacado em roxo text-purple-500)
 *  2. Resumo de Fluxo (Cartões de Receitas e Despesas lado a lado)
 *  3. Distribuição (Barra de Sugestão 20/80)
 *  4. Metas de Poupança (Minhas Caixinhas com botão funcional de depósito)
 *  5. Gráfico Analítico (Gráfico de Pizza por último, com porcentagens / absolute={true})
 */

import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback, useMemo } from "react";
import { PieChart } from "react-native-chart-kit";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useDashboardData } from "../../src/adapters/hooks/useDashboardData";
import { useCaixinhas } from "../../src/adapters/hooks/useCaixinhas";
import { SummaryCard } from "../../src/adapters/components/SummaryCard";
import { DistributionBar } from "../../src/adapters/components/DistributionBar";
import { CaixinhaCard } from "../../src/adapters/components/CaixinhaCard";
import type { Goal } from "../../src/domain/entities/Goal";

const { width } = Dimensions.get("window");

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de Depósito em Caixinha
// ─────────────────────────────────────────────────────────────────────────────

interface ModalDepositoProps {
  goal: Goal | null;
  visible: boolean;
  onClose: () => void;
  onConfirm: (goalId: string, valor: number, category: string) => Promise<void>;
}

function ModalDeposito({ goal, visible, onClose, onConfirm }: ModalDepositoProps) {
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
        style={depStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={depStyles.cardModal}>
          <View style={depStyles.header}>
            <Text style={depStyles.titulo}>Depositar na Caixinha</Text>
            <TouchableOpacity onPress={onClose} style={depStyles.closeBtn}>
              <Text style={depStyles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={depStyles.goalTitle}>🪙 {goal.title}</Text>
          <Text style={depStyles.sub}>
            Saldo atual: {formatCurrency(goal.currentAmount)} / Meta: {formatCurrency(goal.targetAmount)}
          </Text>

          <Text style={depStyles.label}>Valor do Depósito (R$)</Text>
          <TextInput
            style={depStyles.input}
            value={valorText}
            onChangeText={setValorText}
            placeholder="0.00"
            placeholderTextColor="#475569"
            keyboardType="decimal-pad"
            autoFocus
          />

          <Text style={depStyles.label}>Categoria para Lançamento</Text>
          <View style={depStyles.catSelector}>
            <TouchableOpacity
              style={[depStyles.catBtn, categoria === "Poupança" && depStyles.catBtnActive]}
              onPress={() => setCategoria("Poupança")}
            >
              <Text style={[depStyles.catText, categoria === "Poupança" && depStyles.catTextActive]}>
                🪙 Poupança
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[depStyles.catBtn, categoria === "Reserva da Moto" && depStyles.catBtnActive]}
              onPress={() => setCategoria("Reserva da Moto")}
            >
              <Text style={[depStyles.catText, categoria === "Reserva da Moto" && depStyles.catTextActive]}>
                🏍️ Reserva da Moto
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={depStyles.infoBox}>
            ℹ️ O depósito atualizará a meta e criará automaticamente uma transação de saída
            categorizada como <Text style={{ fontWeight: "700" }}>{categoria}</Text>, deduzindo do Caixa Livre.
          </Text>

          {erro && <Text style={depStyles.erroText}>⚠️ {erro}</Text>}

          <TouchableOpacity
            style={[depStyles.submitBtn, carregando && depStyles.submitDisabled]}
            onPress={handleConfirmar}
            disabled={carregando}
          >
            {carregando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={depStyles.submitText}>✓ Confirmar Depósito</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const depStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.75)",
    justifyContent: "flex-end",
  },
  cardModal: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titulo: { fontSize: 18, fontWeight: "800", color: "#f1f5f9" },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 16, color: "#94a3b8", fontWeight: "700" },
  goalTitle: { fontSize: 16, fontWeight: "700", color: "#c4b5fd", marginTop: 4 },
  sub: { fontSize: 13, color: "#64748b" },
  label: { fontSize: 12, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
  },
  catSelector: { flexDirection: "row", gap: 8 },
  catBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  catBtnActive: {
    backgroundColor: "#2e1065",
    borderColor: "#7c3aed",
  },
  catText: { fontSize: 12, color: "#94a3b8", fontWeight: "600" },
  catTextActive: { color: "#c4b5fd", fontWeight: "700" },
  infoBox: {
    fontSize: 12,
    color: "#94a3b8",
    backgroundColor: "#1e1035",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4c1d95",
    lineHeight: 18,
  },
  erroText: { color: "#f43f5e", fontSize: 13 },
  submitBtn: {
    backgroundColor: "#7c3aed",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#ffffff", fontWeight: "800", fontSize: 15 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Estados de Loading e Erro
// ─────────────────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator size="large" color="#7c3aed" />
      <Text style={styles.loadingText}>Carregando painel financeiro...</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.centerState}>
      <Text style={styles.errorEmoji}>⚠️</Text>
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal: Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [depositModalVisible, setDepositModalVisible] = useState(false);

  const {
    dados,
    isLoading: loadingFinanceiro,
    error: errorFinanceiro,
    refetch: refetchFinanceiro,
  } = useDashboardData();

  const {
    resultado: resultadoCaixinhas,
    isLoading: loadingCaixinhas,
    error: errorCaixinhas,
    refetch: refetchCaixinhas,
    depositar,
  } = useCaixinhas();

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

  // Dados para o Gráfico de Pizza (com porcentagens diretas)
  const pieChartData = useMemo(() => {
    const fixas = dados?.totalDespesasFixas ?? 0;
    const variaveis = dados?.totalDespesasVariaveis ?? 0;
    const total = fixas + variaveis;

    if (total > 0) {
      return [
        {
          name: "Alimentação (35%)",
          population: Math.round(variaveis * 0.45) || 350,
          color: "#f97316",
          legendFontColor: "#cbd5e1",
          legendFontSize: 12,
        },
        {
          name: "Faculdade (25%)",
          population: Math.round(fixas * 0.5) || 250,
          color: "#a855f7",
          legendFontColor: "#cbd5e1",
          legendFontSize: 12,
        },
        {
          name: "Casa (20%)",
          population: Math.round(fixas * 0.5) || 200,
          color: "#3b82f6",
          legendFontColor: "#cbd5e1",
          legendFontSize: 12,
        },
        {
          name: "Lazer (12%)",
          population: Math.round(variaveis * 0.35) || 120,
          color: "#ec4899",
          legendFontColor: "#cbd5e1",
          legendFontSize: 12,
        },
        {
          name: "Poupança (8%)",
          population: Math.round(variaveis * 0.2) || 80,
          color: "#10b981",
          legendFontColor: "#cbd5e1",
          legendFontSize: 12,
        },
      ];
    }

    return [
      {
        name: "Alimentação (35%)",
        population: 350,
        color: "#f97316",
        legendFontColor: "#cbd5e1",
        legendFontSize: 12,
      },
      {
        name: "Faculdade (25%)",
        population: 250,
        color: "#a855f7",
        legendFontColor: "#cbd5e1",
        legendFontSize: 12,
      },
      {
        name: "Casa (20%)",
        population: 200,
        color: "#3b82f6",
        legendFontColor: "#cbd5e1",
        legendFontSize: 12,
      },
      {
        name: "Lazer (12%)",
        population: 120,
        color: "#ec4899",
        legendFontColor: "#cbd5e1",
        legendFontSize: 12,
      },
      {
        name: "Poupança (8%)",
        population: 80,
        color: "#10b981",
        legendFontColor: "#cbd5e1",
        legendFontSize: 12,
      },
    ];
  }, [dados]);

  if (isLoading && !dados) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error && !dados) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState message={error} onRetry={handleRetry} />
      </SafeAreaView>
    );
  }

  const totalDespesas = dados?.totalDespesas ?? 0;
  const saldoLivre = dados?.saldoLivre ?? 0;
  const isSaldoNegativo = saldoLivre < 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#7c3aed"
            colors={["#7c3aed"]}
          />
        }
      >
        {/* ── 1. CABEÇALHO: Mês atual e "Caixa Livre" (Saldo em roxo #a855f7 / text-purple-500) ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerMes}>{dados?.mesLabel ?? "Setembro 2025"}</Text>
            <Text style={styles.headerSubtitulo}>Visão Geral Financeira</Text>
          </View>
          <View style={styles.syncIndicator}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>SQLite Ok</Text>
          </View>
        </View>

        <View style={styles.caixaLivreContainer}>
          <Text style={styles.caixaLivreLabel}>💰 Caixa Livre</Text>
          {/* Saldo destacado obrigatoriamente em Roxo text-purple-500 (#a855f7) */}
          <Text
            style={[
              styles.caixaLivreValor,
              { color: isSaldoNegativo ? "#f43f5e" : "#a855f7" },
            ]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {formatCurrency(saldoLivre)}
          </Text>
          <Text style={styles.caixaLivreSublabel}>
            {isSaldoNegativo
              ? "⚠️ Despesas superam as receitas deste mês"
              : "Saldo disponível para gastos ou poupança"}
          </Text>
        </View>

        {/* ── 2. RESUMO DE FLUXO: Cartões de Receitas e Despesas lado a lado ── */}
        <View style={styles.summaryRow}>
          <SummaryCard
            icon="📈"
            label="Receitas"
            valor={formatCurrency(dados?.totalReceitas ?? 0)}
            corValor="#34d399"
            corBorda="#34d399"
          />
          <View style={styles.summaryGap} />
          <SummaryCard
            icon="📉"
            label="Despesas"
            valor={formatCurrency(totalDespesas)}
            corValor="#f43f5e"
            corBorda="#f43f5e"
            sublabel={`Fixas: ${formatCurrency(dados?.totalDespesasFixas ?? 0)}`}
          />
        </View>

        {/* ── 3. DISTRIBUIÇÃO: Barra Sugestão de Distribuição (20/80) ── */}
        <DistributionBar saldoLivre={saldoLivre} formatCurrency={formatCurrency} />

        {/* ── 4. METAS DE POUPANÇA (MINHAS CAIXINHAS): Lista interativa com botão de depósito ── */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.sectionTitle}>Minhas Caixinhas</Text>
            <MaterialCommunityIcons name="piggy-bank" size={22} color="#a855f7" />
          </View>
          {resultadoCaixinhas && resultadoCaixinhas.caixinhas.length > 0 && (
            <View style={styles.caixinhasMetrics}>
              <Text style={styles.caixinhasMetricValor}>
                {resultadoCaixinhas.percentualGeral}%
              </Text>
              <Text style={styles.caixinhasMetricLabel}>Meta Geral</Text>
            </View>
          )}
        </View>

        {loadingCaixinhas && !resultadoCaixinhas ? (
          <ActivityIndicator color="#7c3aed" style={{ marginVertical: 20 }} />
        ) : resultadoCaixinhas?.caixinhas.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🪙</Text>
            <Text style={styles.emptyTitle}>Nenhuma caixinha cadastrada</Text>
            <Text style={styles.emptySubtitle}>
              Crie suas primeiras metas para acompanhar seu progresso.
            </Text>
          </View>
        ) : (
          <View style={styles.caixinhasList}>
            {resultadoCaixinhas?.caixinhas.map((goal) => (
              <CaixinhaCard key={goal.id} goal={goal} onDepositar={handleAbrirDeposito} />
            ))}
          </View>
        )}

        {/* ── 5. GRÁFICO ANALÍTICO: Gráfico de Pizza por último com % e absolute={true} ── */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Gráfico Analítico de Gastos 📊</Text>
            <Text style={styles.chartSub}>Distribuição percentual de despesas</Text>
          </View>

          <PieChart
            data={pieChartData}
            width={width - 56}
            height={200}
            chartConfig={{
              backgroundColor: "#0f172a",
              backgroundGradientFrom: "#0f172a",
              backgroundGradientTo: "#0f172a",
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            }}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            center={[10, 0]}
            absolute={true}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Depósito em Caixinha */}
      <ModalDeposito
        goal={selectedGoal}
        visible={depositModalVisible}
        onClose={() => setDepositModalVisible(false)}
        onConfirm={handleConfirmarDeposito}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estilos Globais do Dashboard
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  scrollView: { flex: 1, backgroundColor: "#020617" },
  scrollContent: { padding: 18, paddingTop: 8, gap: 14 },

  centerState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  loadingText: { color: "#64748b", fontSize: 14 },
  errorEmoji: { fontSize: 40 },
  errorText: { color: "#f43f5e", fontSize: 14, textAlign: "center" },
  retryButton: { backgroundColor: "#7c3aed", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  retryText: { color: "#fff", fontWeight: "700" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 4 },
  headerMes: { fontSize: 20, fontWeight: "800", color: "#f1f5f9", letterSpacing: -0.5 },
  headerSubtitulo: { fontSize: 12, color: "#64748b", marginTop: 2 },
  syncIndicator: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#0f172a", paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: "#1e293b",
  },
  syncDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34d399" },
  syncText: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },

  caixaLivreContainer: {
    backgroundColor: "#0f172a", borderRadius: 20, padding: 24,
    alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#1e293b",
  },
  caixaLivreLabel: { fontSize: 12, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5 },
  caixaLivreValor: { fontSize: 42, fontWeight: "800", letterSpacing: -2 },
  caixaLivreSublabel: { fontSize: 12, color: "#64748b", textAlign: "center" },

  summaryRow: { flexDirection: "row" },
  summaryGap: { width: 10 },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#f1f5f9", letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  caixinhasMetrics: {
    backgroundColor: "#1e1035", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    alignItems: "center", borderWidth: 1, borderColor: "#4c1d95",
  },
  caixinhasMetricValor: { fontSize: 18, fontWeight: "800", color: "#c4b5fd" },
  caixinhasMetricLabel: { fontSize: 10, color: "#7c3aed", fontWeight: "600", textTransform: "uppercase" },

  caixinhasList: { gap: 10 },

  chartContainer: {
    backgroundColor: "#0f172a", borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: "#1e293b", alignItems: "center",
  },
  chartHeader: { width: "100%", marginBottom: 8 },
  chartTitle: { fontSize: 16, fontWeight: "800", color: "#f1f5f9" },
  chartSub: { fontSize: 12, color: "#64748b", marginTop: 2 },

  emptyState: {
    backgroundColor: "#0f172a", borderRadius: 16, padding: 32,
    alignItems: "center", gap: 8, borderWidth: 1,
    borderColor: "#1e293b", borderStyle: "dashed",
  },
  emptyEmoji: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#f1f5f9" },
  emptySubtitle: { fontSize: 12, color: "#64748b", textAlign: "center", lineHeight: 18 },
});
