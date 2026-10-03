/**
 * app/(tabs)/calculadoras.tsx
 */

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  calcularProvisaoPeriodo,
  formatCurrency,
  formatarData
} from "../../src/adapters/calculadoras/calculos";

function CalculadoraTradicional() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
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
        <Text className="text-4xl font-bold text-slate-900 dark:text-slate-100" numberOfLines={1} adjustsFontSizeToFit>
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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const dtFimBase = new Date();
  dtFimBase.setDate(dtFimBase.getDate() + 30);
  
  const [dataInicial, setDataInicial] = useState(new Date());
  const [dataFinal, setDataFinal] = useState(dtFimBase);
  const [showPicker, setShowPicker] = useState<"inicial" | "final" | null>(null);

  // Lógica customizada (dias ativos e deduções)
  const [tipoCalculo, setTipoCalculo] = useState<"ganhos" | "gastos">("ganhos");
  const [diasAtivos, setDiasAtivos] = useState<number[]>([1, 2, 3, 4, 5]); // Padrão: Seg a Sex
  const [valorPorDia, setValorPorDia] = useState("300");
  const [deducaoFrequente, setDeducaoFrequente] = useState("140");
  const [vezesPorSemana, setVezesPorSemana] = useState("2");
  const [descricaoGasto, setDescricaoGasto] = useState("");

  const DIAS_SEMANA = [
    { label: "D", val: 0 },
    { label: "S", val: 1 },
    { label: "T", val: 2 },
    { label: "Q", val: 3 },
    { label: "Q", val: 4 },
    { label: "S", val: 5 },
    { label: "S", val: 6 },
  ];

  const toggleAtividade = (val: number) => {
    if (diasAtivos.includes(val)) {
      setDiasAtivos(diasAtivos.filter((d) => d !== val));
    } else {
      setDiasAtivos([...diasAtivos, val]);
    }
  };

  const valorDiarioNum = parseFloat(valorPorDia.replace(",", ".")) || 0;
  const deducaoNum = tipoCalculo === "ganhos" ? (parseFloat(deducaoFrequente.replace(",", ".")) || 0) : 0;
  const vezesNum = tipoCalculo === "ganhos" ? (parseFloat(vezesPorSemana.replace(",", ".")) || 0) : 0;

  const resultado = calcularProvisaoPeriodo({
    dataInicial,
    dataFinal,
    diasAtivos,
    valorPorDia: valorDiarioNum,
    deducaoFrequente: deducaoNum,
    vezesPorSemana: vezesNum,
  });

  const handleLancar = () => {
    if (resultado.resultadoLiquido <= 0) return;
    const isGasto = tipoCalculo === "gastos";
    router.push({
      pathname: "/lancamentos",
      params: { 
        openModal: "true", 
        amount: String(resultado.resultadoLiquido), 
        title: isGasto ? `Provisão de Gastos (${formatarData(dataInicial)} a ${formatarData(dataFinal)})` : `Provisão de Ganhos (${formatarData(dataInicial)} a ${formatarData(dataFinal)})`,
        category: isGasto ? (descricaoGasto || "Provisões") : "Salário"
      },
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(null); 
    }
    if (selectedDate) {
      if (showPicker === "inicial") setDataInicial(selectedDate);
      if (showPicker === "final") setDataFinal(selectedDate);
    }
  };

  const renderDataChanger = (label: string, dateObj: Date, pickerKey: "inicial" | "final") => (
    <View className="flex-col">
      <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 mt-3">{label}</Text>
      <TouchableOpacity 
        className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
        onPress={() => setShowPicker(pickerKey)}
      >
        <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{formatarData(dateObj)}</Text>
        <Ionicons name="calendar-outline" size={20} color={isDark ? "#c4b5fd" : "#7c3aed"} />
      </TouchableOpacity>
      
      {showPicker === pickerKey && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
    </View>
  );

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
      <View className="flex-row items-center gap-3 mb-5">
        <View className="w-11 h-11 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 items-center justify-center">
          <Ionicons name="trending-up" size={22} color={isDark ? "#22d3ee" : "#0891b2"} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Cálculo de Previsões</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configure inatividades e deduções</Text>
        </View>
      </View>

      <View className="flex-row mx-0 bg-slate-50 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 mt-2 mb-2 shadow-sm">
        <TouchableOpacity
          className={`flex-1 py-2.5 items-center rounded-lg ${tipoCalculo === "ganhos" ? "bg-emerald-100 dark:bg-emerald-900/50" : ""}`}
          onPress={() => setTipoCalculo("ganhos")}
        >
          <Text className={`text-sm font-semibold ${tipoCalculo === "ganhos" ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}>
            Ganhos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2.5 items-center rounded-lg ${tipoCalculo === "gastos" ? "bg-rose-100 dark:bg-rose-900/50" : ""}`}
          onPress={() => setTipoCalculo("gastos")}
        >
          <Text className={`text-sm font-semibold ${tipoCalculo === "gastos" ? "text-rose-700 dark:text-rose-300" : "text-slate-500 dark:text-slate-400"}`}>
            Gastos
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row gap-3 mt-3">
        <View className="flex-1">{renderDataChanger("Início", dataInicial, "inicial")}</View>
        <View className="flex-1">{renderDataChanger("Fim", dataFinal, "final")}</View>
      </View>

      <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 mt-5">Dias da semana</Text>
      <View className="flex-row justify-between">
        {DIAS_SEMANA.map((d) => {
          const isAtivo = diasAtivos.includes(d.val);
          return (
            <TouchableOpacity
              key={d.val}
              onPress={() => toggleAtividade(d.val)}
              className={`w-10 h-10 rounded-full items-center justify-center border ${isAtivo ? "bg-cyan-600 border-cyan-600" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}
            >
              <Text className={`font-bold ${isAtivo ? "text-white" : "text-slate-500 dark:text-slate-400"}`}>{d.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 mt-5">
        {tipoCalculo === "ganhos" ? "Ganhos por Dia (R$)" : "Valor do Gasto (R$)"}
      </Text>
      <TextInput
        className="h-14 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-base text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-medium w-full"
        value={valorPorDia}
        onChangeText={setValorPorDia}
        keyboardType="decimal-pad"
      />

      {tipoCalculo === "ganhos" ? (
        <View className="flex-row gap-4 mt-4">
          <View className="flex-1">
            <Text 
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Deduções frequentes
            </Text>
            <TextInput
              className="h-14 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-base text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-medium w-full"
              value={deducaoFrequente}
              onChangeText={setDeducaoFrequente}
              keyboardType="decimal-pad"
              placeholder="Ex: 140"
            />
          </View>
          <View className="flex-1">
            <Text 
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Vezes na semana
            </Text>
            <TextInput
              className="h-14 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-base text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-medium w-full"
              value={vezesPorSemana}
              onChangeText={setVezesPorSemana}
              keyboardType="decimal-pad"
              placeholder="Ex: 2"
            />
          </View>
        </View>
      ) : (
        <View className="mt-4">
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Destino / Descrição</Text>
          <TextInput
            className="h-14 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 text-base text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-medium w-full"
            value={descricaoGasto}
            onChangeText={setDescricaoGasto}
            placeholder="Ex: Aluguel, Refeição..."
          />
        </View>
      )}

      <View className="h-px bg-slate-200 dark:bg-slate-800 my-5" />

      <View className="gap-2.5 mb-5">
        <View className="flex-row justify-between">
          <Text className="text-sm text-slate-500 dark:text-slate-400">Dias Ativos</Text>
          <Text className="text-sm text-slate-900 dark:text-slate-100 font-semibold">{resultado.diasCalculados} de {resultado.diasTotais} dias</Text>
        </View>
        
        {tipoCalculo === "ganhos" && (
          <>
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500 dark:text-slate-400">Ganho Bruto</Text>
              <Text className="text-sm text-slate-900 dark:text-slate-100 font-semibold">{formatCurrency(resultado.faturamentoBruto)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500 dark:text-slate-400">Deduções Totais</Text>
              <Text className="text-sm text-rose-500 font-semibold">- {formatCurrency(resultado.deducoes)} ({resultado.totalAbastecimentos.toFixed(1)}x)</Text>
            </View>
          </>
        )}
      </View>

      <View className={`${tipoCalculo === "ganhos" ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800" : "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800"} rounded-xl border-2 p-4 items-center mb-5`}>
        <Text className={`text-xs ${tipoCalculo === "ganhos" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} font-bold uppercase tracking-wider`}>
          {tipoCalculo === "ganhos" ? "Lucro Líquido Projetado" : "Gasto Total Projetado"}
        </Text>
        <Text className={`text-3xl font-bold ${tipoCalculo === "ganhos" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"} mt-1 tabular-nums`}>
          {formatCurrency(resultado.resultadoLiquido)}
        </Text>
      </View>

      <TouchableOpacity className={`h-14 ${tipoCalculo === "ganhos" ? "bg-emerald-600" : "bg-rose-600"} rounded-xl p-4 flex-row items-center justify-center gap-2 shadow-sm w-full`} onPress={handleLancar} activeOpacity={0.8}>
        <Ionicons name="save-outline" size={20} color="#fff" />
        <Text className="text-white font-bold text-base">{tipoCalculo === "ganhos" ? "Salvar como Receita" : "Salvar como Despesa"}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CalculadorasScreen() {
  const [tabAtiva, setTabAtiva] = useState<"inteligente" | "tradicional">("inteligente");

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-2.5 pb-4">
        <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Calculadoras 🧮</Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ferramentas do seu domínio financeiro</Text>
      </View>

      <View className="flex-row mx-5 bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800 mb-4 shadow-sm">
        <TouchableOpacity
          className={`flex-1 py-2.5 items-center rounded-lg ${tabAtiva === "inteligente" ? "bg-cyan-100 dark:bg-cyan-900/50" : ""}`}
          onPress={() => setTabAtiva("inteligente")}
        >
          <Text className={`text-sm font-semibold ${tabAtiva === "inteligente" ? "text-cyan-700 dark:text-cyan-300" : "text-slate-500 dark:text-slate-400"}`}>
            Previsões
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2.5 items-center rounded-lg ${tabAtiva === "tradicional" ? "bg-cyan-100 dark:bg-cyan-900/50" : ""}`}
          onPress={() => setTabAtiva("tradicional")}
        >
          <Text className={`text-sm font-semibold ${tabAtiva === "tradicional" ? "text-cyan-700 dark:text-cyan-300" : "text-slate-500 dark:text-slate-400"}`}>
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
