/**
 * app/(tabs)/analytics.tsx
 *
 * Tela dedicada a Gráficos e Estatísticas Detalhadas — Tema Preto & Roxo.
 */

import { useCallback } from "react";
import { View, Text, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { BarChart, LineChart } from "react-native-chart-kit";
import { useDashboardData } from "../../src/adapters/hooks/useDashboardData";

const { width } = Dimensions.get("window");

export default function AnalyticsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { dados, isLoading, error, refetch } = useDashboardData();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-[#05050A]">
        <View className="flex-1" style={{ paddingTop: insets.top }}>
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text className="text-slate-500 mt-4 font-semibold">Analisando dados financeiros...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-[#05050A]">
        <View className="flex-1" style={{ paddingTop: insets.top }}>
          <View className="flex-1 justify-center items-center">
            <Text className="text-orange-500 dark:text-orange-400 mb-4">{error}</Text>
            <TouchableOpacity className="bg-violet-600 px-6 py-3 rounded-xl" onPress={refetch}>
              <Text className="text-white font-bold">Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const historico = dados?.historicoMensal ?? [];
  const labelsHistorico =
    historico.length > 0 ? historico.map((h) => h.labelCurto) : ["M-5", "M-4", "M-3", "M-2", "M-1", "Atual"];
  const serieReceitas =
    historico.length > 0 ? historico.map((h) => Math.round(h.receitas)) : [0, 0, 0, 0, 0, 0];
  const serieDespesas =
    historico.length > 0 ? historico.map((h) => Math.round(h.despesas)) : [0, 0, 0, 0, 0, 0];

  // Dados reais dos últimos 6 meses: Ganhos (Verde Esmeralda) x Saídas (Coral-Âmbar Quente)
  const lineChartData = {
    labels: labelsHistorico,
    datasets: [
      {
        data: serieReceitas,
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Esmeralda (Receitas)
        strokeWidth: 3,
      },
      {
        data: serieDespesas,
        color: (opacity = 1) => `rgba(251, 146, 60, ${opacity})`, // Coral-Âmbar (Despesas — combina com Roxo e Verde!)
        strokeWidth: 3,
      },
    ],
    legend: ["Receitas", "Saídas"],
  };

  const semanas = dados?.despesasPorSemana ?? [0, 0, 0, 0];
  const barChartData = {
    labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
    datasets: [
      {
        data: semanas.map((v) => Math.round(v)),
      },
    ],
  };

  const chartConfig = {
    backgroundColor: "transparent",
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) =>
      isDark ? `rgba(196, 181, 253, ${opacity})` : `rgba(109, 40, 217, ${opacity})`,
    labelColor: (opacity = 1) =>
      isDark ? `rgba(226, 232, 240, ${opacity})` : `rgba(15, 23, 42, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#05050A]">
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
          <View className="mb-6">
            <Text className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Análises 📈
            </Text>
            <Text className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
              Visão macro da sua saúde financeira
            </Text>
          </View>

          {/* Line Chart */}
          <View className="bg-white/90 dark:bg-[#090d16] rounded-[28px] p-5 mb-5 border border-violet-100 dark:border-violet-950/80 shadow-sm">
            <Text className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Evolução Mensal (Últimos 6 Meses)
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Comparativo Real (R$): Receitas (Verde) x Saídas (Coral)
            </Text>

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
          <View className="bg-white/90 dark:bg-[#090d16] rounded-[28px] p-5 mb-5 border border-violet-100 dark:border-violet-950/80 shadow-sm">
            <Text className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Frequência de Despesas
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Em qual semana você concentra mais saídas?
            </Text>

            <BarChart
              data={barChartData}
              width={width - 80}
              height={220}
              yAxisLabel="R$"
              yAxisSuffix=""
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`, // Violeta
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
