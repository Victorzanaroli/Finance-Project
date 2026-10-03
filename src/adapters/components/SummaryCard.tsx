/**
 * src/adapters/components/SummaryCard.tsx
 *
 * Componente visual: Cartão de resumo financeiro (Receitas / Despesas).
 *
 * Aceita qualquer valor numérico e cor de acento — reutilizável.
 * Sem lógica de negócio. Sem imports de domínio ou infraestrutura.
 *
 * NativeWind equivalências dos tokens usados:
 *   bg-slate-900  = #0f172a
 *   text-slate-400 = #94a3b8
 *   text-emerald-400 = #34d399  (receitas)
 *   text-rose-500    = #f43f5e  (despesas)
 */

import { View, Text, StyleSheet } from "react-native";

interface SummaryCardProps {
  /** Ícone/emoji do card. */
  icon: string;
  /** Label superior pequeno. */
  label: string;
  /** Valor formatado em string (ex: "R$ 1.190,00"). */
  valor: string;
  /** Cor do valor — ex: #34d399 (emerald-400) ou #f43f5e (rose-500). */
  corValor: string;
  /** Cor da borda esquerda de acento. */
  corBorda: string;
  /** Sublabel opcional (ex: "Fixas + Variáveis"). */
  sublabel?: string;
}

export function SummaryCard({
  icon,
  label,
  valor,
  corValor,
  corBorda,
  sublabel,
}: SummaryCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: corBorda }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.valor, { color: corValor }]} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#0f172a",  // bg-slate-900
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",            // text-slate-400
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valor: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sublabel: {
    fontSize: 10,
    color: "#475569",            // slate-600
  },
});
