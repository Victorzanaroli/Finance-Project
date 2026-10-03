/**
 * app/(tabs)/analytics.tsx
 *
 * Nova tela dedicada a Gráficos e Estatísticas Detalhadas.
 */

import { View, Text, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { LinearGradient } from "expo-linear-gradient";
import { BarChart, LineChart } from "react-native-chart-kit";
import { useDashboardData } from "../../src/adapters/hooks/useDashboardData";

const { width } = Dimensions.get("window");

export default function AnalyticsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { dados, isLoading, error, refetch } = useDashboardData();

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0891b2" />
          <Text className="text-slate-500 mt-4 font-semibold">Analisando dados financeiros...</Text>
        </View>
      </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <View className="flex-1 justify-center items-center">
          <Text className="text-rose-500 mb-4">{error}</Text>
          <TouchableOpacity className="bg-cyan-600 px-6 py-3 rounded-xl" onPress={refetch}>
            <Text className="text-white font-bold">Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
      </View>
    );
  }

  // Simular dados dos últimos 6 meses para o LineChart
  const lineChartData = {
    labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
    datasets: [
      {
        data: [1200, 1900, 1500, 2200, 1800, dados?.totalReceitas ? dados.totalReceitas / 1000 : 2500],
        color: (opacity = 1) => `rgba(6, 182, 212, ${opacity})`, // Cyan (Ganhos)
        strokeWidth: 3,
      },
      {
        data: [900, 1200, 1400, 1100, 1500, dados?.totalDespesas ? dados.totalDespesas / 1000 : 1600],
        color: (opacity = 1) => `rgba(244, 63, 94, ${opacity})`, // Vermelho (Gastos)
        strokeWidth: 3,
      }
    ],
    legend: ["Receitas", "Despesas"]
  };

  // Simular dados semanais para o BarChart
  const barChartData = {
    labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
    datasets: [
      {
        data: [
          (dados?.totalDespesas ?? 0) * 0.2,
          (dados?.totalDespesas ?? 0) * 0.4,
          (dados?.totalDespesas ?? 0) * 0.1,
          (dados?.totalDespesas ?? 0) * 0.3,
        ]
      }
    ]
  };

  const chartConfig = {
    backgroundColor: "transparent",
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(15, 23, 42, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(15, 23, 42, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
          <View className="mb-6">
            <Text className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Análises 📈</Text>
            <Text className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
              Visão macro da sua saúde financeira
            </Text>
          </View>

          {/* Line Chart */}
          <View className="bg-white/80 dark:bg-slate-900/60 rounded-[28px] p-5 mb-5 border border-slate-200/50 dark:border-slate-800/50 shadow-sm backdrop-blur-md">
            <Text className="text-base font-bold text-slate-900 dark:text-white mb-1">Evolução Mensal (Milhares)</Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mb-6">Comparativo Histórico: Ganhos x Gastos</Text>
            
            <LineChart
              data={lineChartData}
              width={width - 80}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
              withInnerLines={false}
              withOuterLines={false}
            />
          </View>

          {/* Bar Chart */}
          <View className="bg-white/80 dark:bg-slate-900/60 rounded-[28px] p-5 mb-5 border border-slate-200/50 dark:border-slate-800/50 shadow-sm backdrop-blur-md">
            <Text className="text-base font-bold text-slate-900 dark:text-white mb-1">Frequência de Despesas</Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mb-6">Em qual semana você gasta mais?</Text>
            
            <BarChart
              data={barChartData}
              width={width - 80}
              height={220}
              yAxisLabel="R$"
              yAxisSuffix=""
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(6, 182, 212, ${opacity})`, // Cyan
              }}
              style={{ marginVertical: 8, borderRadius: 16 }}
              withInnerLines={false}
              showValuesOnTopOfBars
            />
          </View>

          <View className="h-10" />
        </ScrollView>
      </View>
    </View>
  );
}
