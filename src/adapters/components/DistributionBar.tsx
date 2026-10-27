import { View, Text, StyleSheet } from "react-native";
import { useColorScheme } from "nativewind";

interface DistributionBarProps {
  saldoLivre: number;
  formatCurrency: (value: number) => string;
}

export function DistributionBar({ saldoLivre, formatCurrency }: DistributionBarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  if (saldoLivre <= 0) return null;

  const savingGoal = saldoLivre * 0.2;
  const spendingLimit = saldoLivre * 0.8;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#090d16" : "#ffffff",
          borderColor: isDark ? "#2e1065" : "#ede9fe",
        },
      ]}
    >
      <Text style={[styles.title, { color: isDark ? "#f1f5f9" : "#0f172a" }]}>
        Sugestão de Distribuição (20/80)
      </Text>

      <View style={styles.barContainer}>
        <View style={[styles.barSegment, { flex: 2, backgroundColor: "#10b981" }]} />
        <View style={[styles.barSegment, { flex: 8, backgroundColor: "#8b5cf6" }]} />
      </View>

      <View style={styles.labelsContainer}>
        <View style={styles.labelWrapper}>
          <View style={[styles.dot, { backgroundColor: "#10b981" }]} />
          <View>
            <Text style={[styles.labelTitle, { color: isDark ? "#94a3b8" : "#64748b" }]}>
              Poupar (20%)
            </Text>
            <Text style={[styles.labelValue, { color: isDark ? "#34d399" : "#059669" }]}>
              {formatCurrency(savingGoal)}
            </Text>
          </View>
        </View>

        <View style={styles.labelWrapper}>
          <View style={[styles.dot, { backgroundColor: "#8b5cf6" }]} />
          <View>
            <Text style={[styles.labelTitle, { color: isDark ? "#94a3b8" : "#64748b" }]}>
              Gastar (80%)
            </Text>
            <Text style={[styles.labelValue, { color: isDark ? "#c4b5fd" : "#7c3aed" }]}>
              {formatCurrency(spendingLimit)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  title: { fontSize: 14, fontWeight: "700", marginBottom: 12 },
  barContainer: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", gap: 2 },
  barSegment: { height: "100%" },
  labelsContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  labelWrapper: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  labelTitle: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  labelValue: { fontSize: 14, fontWeight: "800" },
});
