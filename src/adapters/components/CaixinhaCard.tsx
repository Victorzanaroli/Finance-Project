/**
 * src/adapters/components/CaixinhaCard.tsx
 *
 * Componente visual: Cartão de uma Caixinha de Poupança (Meta).
 *
 * Exibe:
 *   - Título e emoji de status (✅ se concluída)
 *   - Valor acumulado vs. valor alvo
 *   - Barra de progresso animada
 *   - Percentual e valor restante
 *   - Botão em destaque "Depositar" para aportar valores na caixinha
 */

import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from "react-native";
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
  const progressAnim = useRef(new Animated.Value(0)).current;
  const percentual = goal.percentualConcluido / 100; // 0.0 → 1.0

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

  return (
    <View style={[styles.card, isConcluida && styles.cardConcluido]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.indicadorCor}>
          <View style={[styles.dot, { backgroundColor: goal.colorHex }]} />
        </View>
        <Text style={styles.titulo} numberOfLines={1}>
          {isConcluida ? "✅ " : ""}{goal.title}
        </Text>
        <Text
          style={[
            styles.percentualBadge,
            { backgroundColor: isConcluida ? "#065f46" : "#1e1035" },
            { color: isConcluida ? "#34d399" : "#c4b5fd" },
          ]}
        >
          {goal.percentualConcluido}%
        </Text>
      </View>

      {/* Valores */}
      <View style={styles.valoresRow}>
        <Text style={styles.valorAtual}>
          <Text style={[styles.valorAtualNum, { color: isConcluida ? "#34d399" : "#22d3ee" }]}>
            {formatCurrency(goal.currentAmount)}
          </Text>
        </Text>
        <Text style={styles.separador}>/</Text>
        <Text style={styles.valorMeta}>{formatCurrency(goal.targetAmount)}</Text>
      </View>

      {/* Barra de progresso */}
      <View
        style={styles.barraContainer}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: goal.percentualConcluido }}
      >
        <Animated.View
          style={[
            styles.barraPreenchida,
            {
              width: barraWidth,
              backgroundColor: isConcluida ? "#059669" : "#7c3aed",
            },
          ]}
        />
      </View>

      {/* Rodapé: falta / concluída + Botão Depositar */}
      <View style={styles.rodapeRow}>
        {isConcluida ? (
          <Text style={styles.concluidaTexto}>🎉 Meta atingida!</Text>
        ) : (
          <Text style={styles.faltaTexto}>
            Faltam{" "}
            <Text style={styles.faltaValor}>{formatCurrency(valorRestante)}</Text>
          </Text>
        )}

        {onDepositar && (
          <TouchableOpacity
            style={styles.depositarBtn}
            onPress={() => onDepositar(goal)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Depositar na caixinha ${goal.title}`}
          >
            <Text style={styles.depositarBtnText}>💰 Depositar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardConcluido: {
    borderColor: "#065f46",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  indicadorCor: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  titulo: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  percentualBadge: {
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },

  valoresRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  valorAtual: {
    fontSize: 14,
  },
  valorAtualNum: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  separador: {
    fontSize: 14,
    color: "#475569",
    marginHorizontal: 4,
  },
  valorMeta: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },

  barraContainer: {
    height: 8,
    backgroundColor: "#334155",
    borderRadius: 4,
    overflow: "hidden",
  },
  barraPreenchida: {
    height: "100%",
    borderRadius: 4,
  },

  rodapeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  faltaTexto: {
    fontSize: 12,
    color: "#64748b",
  },
  faltaValor: {
    color: "#94a3b8",
    fontWeight: "600",
  },
  concluidaTexto: {
    fontSize: 12,
    color: "#34d399",
    fontWeight: "600",
  },

  depositarBtn: {
    backgroundColor: "#2e1065",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#7c3aed",
  },
  depositarBtnText: {
    color: "#c4b5fd",
    fontSize: 12,
    fontWeight: "700",
  },
});
