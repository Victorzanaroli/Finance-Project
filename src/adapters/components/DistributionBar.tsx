/**
 * src/adapters/components/DistributionBar.tsx
 *
 * Componente visual: Barra de Distribuição Sugerida do Saldo Livre.
 *
 * Divide visualmente o Caixa Livre em:
 *   80% → Guardar/Investir  (bg-purple-600 = #7c3aed)
 *   20% → Lazer/Gastos      (bg-amber-400  = #fbbf24)
 *
 * Regras visuais:
 *   - Se saldo for negativo: exibe aviso vermelho sem barra.
 *   - Animação de entrada na barra (Animated.timing).
 *   - Sem lógica de negócio — recebe saldoLivre como prop.
 */

import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";

const PERCENTUAL_GUARDAR = 0.8;   // 80%
const PERCENTUAL_LAZER   = 0.2;   // 20%

// Cores — mapeamento NativeWind:
const COR_GUARDAR = "#7c3aed";    // bg-purple-600
const COR_LAZER   = "#f59e0b";    // bg-amber-400 / laranja
const COR_NEGATIVO = "#f43f5e";   // rose-500

interface DistributionBarProps {
  saldoLivre: number;
  formatCurrency: (v: number) => string;
}

export function DistributionBar({ saldoLivre, formatCurrency }: DistributionBarProps) {
  const animWidth = useRef(new Animated.Value(0)).current;

  // Anima a barra ao montar ou quando saldo muda
  useEffect(() => {
    if (saldoLivre <= 0) return;
    animWidth.setValue(0);
    Animated.timing(animWidth, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [saldoLivre, animWidth]);

  const isNegativo = saldoLivre <= 0;
  const valorGuardar = saldoLivre * PERCENTUAL_GUARDAR;
  const valorLazer   = saldoLivre * PERCENTUAL_LAZER;

  // A barra Lazer ocupa 20% da largura total; Guardar ocupa 80%
  const lazerWidth = animWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", `${PERCENTUAL_LAZER * 100}%`],
  });

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Sugestão de distribuição</Text>
        <Text style={styles.subtitle}>do Caixa Livre</Text>
      </View>

      {isNegativo ? (
        <View style={styles.negativoAviso}>
          <Text style={styles.negativoTexto}>
            ⚠️ Saldo negativo — ajuste suas despesas para ver a sugestão.
          </Text>
        </View>
      ) : (
        <>
          {/* Barra horizontal */}
          <View style={styles.barraContainer}>
            {/* Segmento Lazer (20% — fica à esquerda em laranja) */}
            <Animated.View style={[styles.barraLazer, { width: lazerWidth }]} />
            {/* Segmento Guardar (80% — fica à direita em roxo) */}
            <Animated.View
              style={[
                styles.barraGuardar,
                {
                  flex: animWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }) as any,
                },
              ]}
            />
          </View>

          {/* Legenda */}
          <View style={styles.legendaRow}>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaDot, { backgroundColor: COR_LAZER }]} />
              <View>
                <Text style={styles.legendaLabel}>🎉 Lazer (20%)</Text>
                <Text style={[styles.legendaValor, { color: COR_LAZER }]}>
                  {formatCurrency(valorLazer)}
                </Text>
              </View>
            </View>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaDot, { backgroundColor: COR_GUARDAR }]} />
              <View>
                <Text style={styles.legendaLabel}>🏦 Guardar (80%)</Text>
                <Text style={[styles.legendaValor, { color: COR_GUARDAR }]}>
                  {formatCurrency(valorGuardar)}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0f172a",  // bg-slate-900
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  subtitle: {
    fontSize: 11,
    color: "#64748b",
  },

  // Barra
  barraContainer: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1e293b",  // bg-slate-800 — trilho
    overflow: "hidden",
  },
  barraLazer: {
    height: "100%",
    backgroundColor: COR_LAZER,
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  barraGuardar: {
    height: "100%",
    backgroundColor: COR_GUARDAR,
  },

  // Legenda
  legendaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legendaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendaLabel: {
    fontSize: 11,
    color: "#94a3b8",
  },
  legendaValor: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Negativo
  negativoAviso: {
    backgroundColor: "#1c0a12",
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: COR_NEGATIVO,
  },
  negativoTexto: {
    fontSize: 12,
    color: COR_NEGATIVO,
    lineHeight: 18,
  },
});
