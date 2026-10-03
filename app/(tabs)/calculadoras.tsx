/**
 * app/(tabs)/calculadoras.tsx
 *
 * Tela: Calculadoras — Inteligente & Tradicional
 * Refatorado com NativeWind (className) suportando Dark & Light Mode.
 */

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";

import {
  calcularProvisaoPeriodo,
  formatCurrency,
  formatarData
} from "../../src/adapters/calculadoras/calculos";

function CalculadoraTradicional() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [visor, setVisor] = useState("0");
  const [expressao, setExpressao] = useState("");
  const [resultadoObtido, setResultadoObtido] = useState(false);

  const handlePress = (val: string) => {
    if (resultadoObtido) {
      if (/[0-9]/.test(val)) {
        setVisor(val);
        setExpressao("");
      } else {
        setExpressao(visor + " " + val + " ");
        setVisor("0");
      }
      setResultadoObtido(false);
      return;
    }

    if (["+", "-", "*", "/"].includes(val)) {
      setExpressao(expressao + visor + " " + val + " ");
      setVisor("0");
      return;
    }

    if (val === "=") {
      try {
        const evalStr = (expressao + visor).replace(/×/g, "*").replace(/÷/g, "/");
        // eslint-disable-next-line no-new-func
        const res = new Function(`return ${evalStr}`)();
        const finalRes = Number.isInteger(res) ? String(res) : Number(res).toFixed(2);
        setVisor(finalRes);
        setExpressao("");
        setResultadoObtido(true);
      } catch (e) {
        setVisor("Erro");
      }
      return;
    }

    if (val === "C") {
      setVisor("0");
      setExpressao("");
      return;
    }
    
    if (val === "DEL") {
      setVisor(visor.length > 1 ? visor.slice(0, -1) : "0");
      return;
    }

    if (visor === "0") {
      setVisor(val === "." ? "0." : val);
    } else {
      if (val === "." && visor.includes(".")) return;
      setVisor(visor + val);
    }
  };

  const handleLancar = () => {
    if (visor === "0" || visor === "Erro") return;
    router.push({
      pathname: "/lancamentos",
      params: { openModal: "true", amount: visor, title: "Cálculo Rápido" },
    });
  };

  const botoes = [
    ["C", "DEL", "/", "*"],
    ["7", "8", "9", "-"],
    ["4", "5", "6", "+"],
    ["1", "2", "3", "="],
    ["0", ".", ""],
  ];

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
      <View className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 items-end border border-slate-200 dark:border-slate-800 mb-5 h-24 justify-center">
        <Text className="text-base text-slate-500 dark:text-slate-400 mb-1 font-sans">{expressao}</Text>
        <Text className="text-4xl font-bold text-slate-900 dark:text-slate-100 font-bold" numberOfLines={1} adjustsFontSizeToFit>
          {visor}
        </Text>
      </View>

      <View className="gap-3 mb-5">
        {botoes.map((linha, i) => (
          <View key={i} className="flex-row gap-3 justify-between">
            {linha.map((btn, j) => {
              if (btn === "") return <View key={j} className="flex-1 aspect-square" />;
              const isOperator = ["+", "-", "*", "/", "=", "C", "DEL"].includes(btn);
              const isZero = btn === "0";
              const isEqual = btn === "=";

              let btnClass = "flex-1 aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl items-center justify-center";
              if (isZero) btnClass = "flex-[2.15] aspect-[2.15] bg-slate-100 dark:bg-slate-800 rounded-xl items-center justify-center";
              if (isOperator) btnClass = "flex-1 aspect-square bg-purple-100 dark:bg-purple-900/30 rounded-xl items-center justify-center";
              if (isEqual) btnClass = "flex-1 aspect-square bg-purple-600 rounded-xl items-center justify-center shadow-sm";

              let textClass = "text-2xl font-semibold text-slate-900 dark:text-slate-100";
              if (isOperator && !isEqual) textClass = "text-2xl font-semibold text-purple-600 dark:text-purple-400";
              if (isEqual) textClass = "text-2xl font-semibold text-white";

              return (
                <TouchableOpacity key={j} className={btnClass} onPress={() => handlePress(btn)}>
                  <Text className={textClass}>{btn}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <TouchableOpacity className="bg-purple-600 rounded-xl p-4 flex-row items-center justify-center gap-2 shadow-sm" onPress={handleLancar} activeOpacity={0.8}>
        <Ionicons name="paper-plane-outline" size={20} color="#fff" />
        <Text className="text-white font-bold text-base">Lançar Resultado</Text>
      </TouchableOpacity>
    </View>
  );
}

function CalculadoraProvisao() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [diasAddInicio, setDiasAddInicio] = useState(0);
  const [diasAddFim, setDiasAddFim] = useState(30);
  const [apenasDiasUteis, setApenasDiasUteis] = useState(false);
  const [valorPorDia, setValorPorDia] = useState("0");
  const [deducoesFixas, setDeducoesFixas] = useState("0");

  const dataInicial = new Date();
  dataInicial.setDate(dataInicial.getDate() + diasAddInicio);

  const dataFinal = new Date();
  dataFinal.setDate(dataFinal.getDate() + diasAddFim);

  const valorDiarioNum = parseFloat(valorPorDia.replace(",", ".")) || 0;
  const deducoesNum = parseFloat(deducoesFixas.replace(",", ".")) || 0;

  const resultado = calcularProvisaoPeriodo({
    dataInicial,
    dataFinal,
    apenasDiasUteis,
    valorPorDia: valorDiarioNum,
    deducoesFixas: deducoesNum,
  });

  const handleLancar = () => {
    if (resultado.resultadoLiquido <= 0) return;
    router.push({
      pathname: "/lancamentos",
      params: { 
        openModal: "true", 
        amount: String(resultado.resultadoLiquido), 
        title: `Provisão (${formatarData(dataInicial)} a ${formatarData(dataFinal)})`,
      },
    });
  };

  const renderDataChanger = (label: string, dateObj: Date, value: number, setValue: (val: number) => void) => (
    <View className="flex-col">
      <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 mt-3">{label}</Text>
      <View className="flex-row items-center bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <TouchableOpacity className="w-12 h-12 items-center justify-center bg-slate-100 dark:bg-slate-800" onPress={() => setValue(value - 1)}>
          <Text className="text-2xl text-purple-600 dark:text-purple-400 font-light">-</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-center text-base font-bold text-slate-900 dark:text-slate-100 border-x border-slate-200 dark:border-slate-700 py-3">{formatarData(dateObj)}</Text>
        <TouchableOpacity className="w-12 h-12 items-center justify-center bg-slate-100 dark:bg-slate-800" onPress={() => setValue(value + 1)}>
          <Text className="text-2xl text-purple-600 dark:text-purple-400 font-light">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
      <View className="flex-row items-center gap-3 mb-5">
        <View className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/40 items-center justify-center">
          <Ionicons name="analytics" size={22} color={isDark ? "#c4b5fd" : "#7c3aed"} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Provisão de Período</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Previsão de ganhos e gastos</Text>
        </View>
      </View>

      {renderDataChanger("Data Inicial", dataInicial, diasAddInicio, setDiasAddInicio)}
      <View className="h-3" />
      {renderDataChanger("Data Final", dataFinal, diasAddFim, setDiasAddFim)}

      <View className="flex-row justify-between items-center mt-5">
        <View>
          <Text className="text-sm text-slate-900 dark:text-slate-100 font-semibold">Apenas Dias Úteis</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ignora Sábados e Domingos</Text>
        </View>
        <Switch
          value={apenasDiasUteis}
          onValueChange={setApenasDiasUteis}
          trackColor={{ false: isDark ? "#334155" : "#e2e8f0", true: "#7c3aed" }}
          thumbColor="#fff"
        />
      </View>

      <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 mt-4">Valor por Dia (R$)</Text>
      <TextInput
        className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3.5 text-base text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-medium"
        value={valorPorDia}
        onChangeText={setValorPorDia}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
      />

      <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 mt-4">Deduções Fixas no Período (R$)</Text>
      <TextInput
        className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3.5 text-base text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-medium"
        value={deducoesFixas}
        onChangeText={setDeducoesFixas}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
      />

      <View className="h-px bg-slate-200 dark:bg-slate-800 my-5" />

      <View className="gap-2.5 mb-5">
        <View className="flex-row justify-between">
          <Text className="text-sm text-slate-500 dark:text-slate-400">Período calculado</Text>
          <Text className="text-sm text-slate-900 dark:text-slate-100 font-semibold">{resultado.diasCalculados} dias</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-slate-500 dark:text-slate-400">Bruto Gerado</Text>
          <Text className="text-sm text-slate-900 dark:text-slate-100 font-semibold">{formatCurrency(resultado.faturamentoBruto)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-slate-500 dark:text-slate-400">Deduções Fixas</Text>
          <Text className="text-sm text-rose-500 font-semibold">- {formatCurrency(resultado.deducoes)}</Text>
        </View>
      </View>

      <View className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border-2 border-purple-100 dark:border-purple-800 p-4 items-center mb-5">
        <Text className="text-xs text-purple-600 dark:text-purple-300 font-bold uppercase tracking-wider">Resultado Líquido</Text>
        <Text className="text-3xl font-bold text-purple-700 dark:text-purple-400 mt-1 tabular-nums">
          {formatCurrency(resultado.resultadoLiquido)}
        </Text>
      </View>

      <TouchableOpacity className="bg-purple-600 rounded-xl p-4 flex-row items-center justify-center gap-2 shadow-sm" onPress={handleLancar} activeOpacity={0.8}>
        <Ionicons name="save-outline" size={20} color="#fff" />
        <Text className="text-white font-bold text-base">Salvar Provisão</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CalculadorasScreen() {
  const [tabAtiva, setTabAtiva] = useState<"tradicional" | "inteligente">("inteligente");

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-2.5 pb-4">
        <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Calculadoras 🧮</Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ferramentas do seu domínio financeiro</Text>
      </View>

      <View className="flex-row mx-5 bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800 mb-4 shadow-sm">
        <TouchableOpacity
          className={`flex-1 py-2.5 items-center rounded-lg ${tabAtiva === "inteligente" ? "bg-purple-100 dark:bg-purple-900/50" : ""}`}
          onPress={() => setTabAtiva("inteligente")}
        >
          <Text className={`text-sm font-semibold ${tabAtiva === "inteligente" ? "text-purple-700 dark:text-purple-300" : "text-slate-500 dark:text-slate-400"}`}>
            Provisões
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2.5 items-center rounded-lg ${tabAtiva === "tradicional" ? "bg-purple-100 dark:bg-purple-900/50" : ""}`}
          onPress={() => setTabAtiva("tradicional")}
        >
          <Text className={`text-sm font-semibold ${tabAtiva === "tradicional" ? "text-purple-700 dark:text-purple-300" : "text-slate-500 dark:text-slate-400"}`}>
            Tradicional
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {tabAtiva === "inteligente" ? <CalculadoraProvisao /> : <CalculadoraTradicional />}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
