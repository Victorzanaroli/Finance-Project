/**
 * src/adapters/components/CaixinhaCard.tsx
 */

import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, useColorScheme } from "react-native";
import { useEffect, useRef } from "react";
import type { Goal } from "../../domain/entities/Goal";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

interface CaixinhaCardProps {
  goal: Goal;
  onDepositar?: (goal: Goal) => void;
}

export function CaixinhaCard({ goal, onDepositar }: CaixinhaCardProps) {
  const isDark = useColorScheme() === "dark";
  const progressAnim = useRef(new Animated.Value(0)).current;
  const percentual = goal.percentualConcluido / 100;

  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: percentual,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percentual, progressAnim]);

  const valorRestante = goal.targetAmount - goal.currentAmount;
  const isConcluida = goal.concluida;

  const barraWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const bgColor = isDark ? "#0f172a" : "#ffffff";
  const borderColor = isConcluida ? (isDark ? "#065f46" : "#10b981") : (isDark ? "#1e293b" : "#e2e8f0");
  const textColor = isDark ? "#f1f5f9" : "#0f172a";
  const textMuted = isDark ? "#64748b" : "#94a3b8";

  return (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.indicadorCor, { backgroundColor: isDark ? "#1e293b" : "#f1f5f9" }]}>
          <View style={[styles.dot, { backgroundColor: goal.colorHex }]} />
        </View>
        <Text style={[styles.titulo, { color: textColor }]} numberOfLines={1}>
          {isConcluida ? "✅ " : ""}{goal.title}
        </Text>
        <Text
          style={[
            styles.percentualBadge,
            { backgroundColor: isConcluida ? (isDark ? "#065f46" : "#d1fae5") : (isDark ? "#1e1035" : "#f3e8ff") },
            { color: isConcluida ? (isDark ? "#34d399" : "#059669") : (isDark ? "#c4b5fd" : "#7c3aed") },
          ]}
        >
          {goal.percentualConcluido}%
        </Text>
      </View>

      <View style={styles.valoresRow}>
        <Text style={styles.valorAtual}>
          <Text style={[styles.valorAtualNum, { color: isConcluida ? (isDark ? "#34d399" : "#059669") : (isDark ? "#22d3ee" : "#0284c7") }]}>
            {formatCurrency(goal.currentAmount)}
          </Text>
        </Text>
        <Text style={[styles.separador, { color: textMuted }]}>/</Text>
        <Text style={[styles.valorMeta, { color: textMuted }]}>{formatCurrency(goal.targetAmount)}</Text>
      </View>

      <View style={[styles.barraContainer, { backgroundColor: isDark ? "#334155" : "#e2e8f0" }]}>
        <Animated.View
          style={[
            styles.barraPreenchida,
            {
              width: barraWidth,
              backgroundColor: isConcluida ? "#10b981" : "#7c3aed",
            },
          ]}
        />
      </View>

      <View style={styles.rodapeRow}>
        {isConcluida ? (
          <Text style={[styles.concluidaTexto, { color: isDark ? "#34d399" : "#059669" }]}>🎉 Meta atingida!</Text>
        ) : (
          <Text style={[styles.faltaTexto, { color: textMuted }]}>
            Faltam <Text style={[styles.faltaValor, { color: isDark ? "#94a3b8" : "#475569" }]}>{formatCurrency(valorRestante)}</Text>
          </Text>
        )}

        {onDepositar && (
          <TouchableOpacity
            style={[styles.depositarBtn, { backgroundColor: isDark ? "#2e1065" : "#f3e8ff", borderColor: isDark ? "#7c3aed" : "#c084fc" }]}
            onPress={() => onDepositar(goal)}
            activeOpacity={0.8}
          >
            <Text style={[styles.depositarBtnText, { color: isDark ? "#c4b5fd" : "#7c3aed" }]}>💰 Depositar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  indicadorCor: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  titulo: { flex: 1, fontSize: 15, fontWeight: "700" },
  percentualBadge: { fontSize: 11, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  valoresRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  valorAtual: { fontSize: 14 },
  valorAtualNum: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  separador: { fontSize: 14, marginHorizontal: 4 },
  valorMeta: { fontSize: 14, fontWeight: "500" },
  barraContainer: { height: 8, borderRadius: 4, overflow: "hidden" },
  barraPreenchida: { height: "100%", borderRadius: 4 },
  rodapeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  faltaTexto: { fontSize: 12 },
  faltaValor: { fontWeight: "600" },
  concluidaTexto: { fontSize: 12, fontWeight: "600" },
  depositarBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  depositarBtnText: { fontSize: 12, fontWeight: "700" },
});
