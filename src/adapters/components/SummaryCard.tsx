import { View, Text, StyleSheet } from "react-native";
import { useColorScheme } from "react-native";

interface SummaryCardProps {
  icon: string;
  label: string;
  valor: string;
  corValor: string;
  corBorda: string;
  sublabel?: string;
}

export function SummaryCard({ icon, label, valor, corValor, corBorda, sublabel }: SummaryCardProps) {
  const isDark = useColorScheme() === "dark";
  const bgColor = isDark ? "#0f172a" : "#ffffff";
  const borderColor = isDark ? "#1e293b" : "#e2e8f0";

  return (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor: borderColor, borderLeftColor: corBorda, borderLeftWidth: 4 }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, { color: isDark ? "#94a3b8" : "#64748b" }]}>{label}</Text>
      <Text style={[styles.valor, { color: corValor }]} adjustsFontSizeToFit numberOfLines={1}>
        {valor}
      </Text>
      {sublabel && <Text style={[styles.sublabel, { color: isDark ? "#475569" : "#94a3b8" }]}>{sublabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  icon: { fontSize: 20 },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  valor: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  sublabel: { fontSize: 10, fontWeight: "500" },
});
