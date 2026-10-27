import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";

import { useShoppingList } from "../src/adapters/hooks/useShoppingList";
import type {
  ShoppingCategory,
  ShoppingItemEntity,
} from "../src/domain/repositories/IShoppingItemRepository";

function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export default function ShoppingListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    items,
    isLoading,
    resumo,
    adicionarItem,
    alternarComprado,
    removerItem,
    limparComprados,
    parseCurrencyString,
  } = useShoppingList();

  const [newItemName, setNewItemName] = useState("");
  const [newEstimatedValue, setNewEstimatedValue] = useState("");
  const [activeCategory, setActiveCategory] = useState<ShoppingCategory>("Todos");

  const categories: ShoppingCategory[] = ["Todos", "Mercado", "Desejos/Roupas"];

  const handleAddItem = async () => {
    const ok = await adicionarItem(newItemName, newEstimatedValue, activeCategory);
    if (ok) {
      setNewItemName("");
      setNewEstimatedValue("");
    }
  };

  const handleLancarNoExtrato = (item: ShoppingItemEntity) => {
    const numVal = parseCurrencyString(item.estimatedValue);
    router.push({
      pathname: "/lancamentos",
      params: {
        openModal: "true",
        title: item.name,
        amount: numVal > 0 ? String(numVal.toFixed(2)) : "",
        category: item.category === "Mercado" ? "Alimentação" : "Lazer",
      },
    });
  };

  const filteredItems = items.filter(
    (item) => activeCategory === "Todos" || item.category === activeCategory
  );

  const formatCurrencyInput = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, "");
    if (numericValue === "") return "";
    const floatValue = parseFloat(numericValue) / 100;
    return floatValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#05050A]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ paddingTop: insets.top, paddingHorizontal: 20 }} className="pb-3">
          {/* HEADER */}
          <View className="flex-row items-center justify-between mb-4 mt-2">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 -ml-2 rounded-full bg-violet-100 dark:bg-violet-950/70"
            >
              <Ionicons name="arrow-back" size={24} color={isDark ? "#c4b5fd" : "#7c3aed"} />
            </TouchableOpacity>
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-extrabold text-slate-900 dark:text-white">
                Lista de Compras
              </Text>
              <MaterialCommunityIcons
                name="cart-outline"
                size={24}
                color={isDark ? "#c4b5fd" : "#7c3aed"}
              />
            </View>
            {resumo.quantidadeComprada > 0 ? (
              <TouchableOpacity
                onPress={limparComprados}
                className="px-2.5 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/80"
              >
                <Text className="text-[11px] font-bold text-violet-700 dark:text-violet-300">
                  Limpar ({resumo.quantidadeComprada})
                </Text>
              </TouchableOpacity>
            ) : (
              <View className="w-10" />
            )}
          </View>

          {/* RESUMO FINANCEIRO DA LISTA (SALVO NO SQLITE) */}
          <View className="flex-row gap-2.5 mb-4">
            <View className="flex-1 bg-white dark:bg-[#090d16] rounded-2xl p-3 border border-violet-100 dark:border-violet-950/80">
              <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                Total Planejado
              </Text>
              <Text className="text-base font-extrabold text-violet-700 dark:text-violet-300 mt-0.5">
                {formatBRL(resumo.totalEstimado)}
              </Text>
            </View>
            <View className="flex-1 bg-white dark:bg-[#090d16] rounded-2xl p-3 border border-violet-100 dark:border-violet-950/80">
              <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                Já Comprado ({resumo.quantidadeComprada}/{resumo.quantidadeTotal})
              </Text>
              <Text className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatBRL(resumo.totalComprado)}
              </Text>
            </View>
          </View>

          {/* TABS DE CATEGORIA */}
          <View className="flex-row gap-2 mb-4">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl border ${
                  activeCategory === cat
                    ? "bg-violet-100 border-violet-400 dark:bg-violet-950/80 dark:border-violet-500"
                    : "bg-white border-slate-200 dark:bg-[#090d16] dark:border-violet-950/60"
                }`}
              >
                <Text
                  className={`font-semibold text-sm ${
                    activeCategory === cat
                      ? "text-violet-700 dark:text-violet-300"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* FORMULÁRIO DE ADIÇÃO */}
          <View className="bg-white dark:bg-[#090d16] rounded-2xl p-4 shadow-sm border border-violet-100 dark:border-violet-950/80 mb-2">
            <TextInput
              className="font-medium text-base text-slate-900 dark:text-white mb-3"
              placeholder="Ex: Tênis novo, Compra do mês"
              placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
              value={newItemName}
              onChangeText={setNewItemName}
            />
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 flex-row items-center bg-slate-50 dark:bg-[#05050A] rounded-xl px-3 py-2 border border-slate-200 dark:border-violet-950">
                <MaterialCommunityIcons
                  name="currency-brl"
                  size={18}
                  color={isDark ? "#a78bfa" : "#7c3aed"}
                />
                <TextInput
                  className="flex-1 ml-2 font-semibold text-sm text-slate-900 dark:text-white"
                  placeholder="R$ 0,00"
                  placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                  keyboardType="numeric"
                  value={newEstimatedValue}
                  onChangeText={(text) => setNewEstimatedValue(formatCurrencyInput(text))}
                />
              </View>
              <TouchableOpacity
                onPress={handleAddItem}
                className="bg-violet-600 rounded-xl px-5 py-3 items-center justify-center flex-row gap-2 shadow-sm shadow-violet-500/30"
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text className="text-white font-bold">Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* LISTAGEM DE ITENS PERSISTIDOS NO SQLITE */}
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {isLoading ? (
            <ActivityIndicator color="#8b5cf6" className="mt-10" />
          ) : filteredItems.length === 0 ? (
            <View className="items-center justify-center mt-10">
              <MaterialCommunityIcons
                name="cart-remove"
                size={64}
                color={isDark ? "#1e1b4b" : "#ede9fe"}
              />
              <Text className="text-slate-500 dark:text-slate-400 mt-4 font-medium text-center">
                Nenhum item salvo em "{activeCategory}".
              </Text>
            </View>
          ) : (
            filteredItems.map((item) => (
              <View
                key={item.id}
                className={`flex-row items-center justify-between bg-white dark:bg-[#090d16] p-4 rounded-2xl mb-3 border ${
                  item.isBought
                    ? "border-emerald-300 dark:border-emerald-900/50 opacity-85"
                    : "border-violet-100 dark:border-violet-950/80"
                } shadow-sm`}
              >
                <TouchableOpacity
                  onPress={() => alternarComprado(item.id)}
                  className="flex-row items-center flex-1 gap-3"
                >
                  <View
                    className={`w-6 h-6 rounded-md items-center justify-center border ${
                      item.isBought
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-transparent border-violet-300 dark:border-violet-700"
                    }`}
                  >
                    {item.isBought && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`font-semibold text-base ${
                        item.isBought
                          ? "text-slate-400 dark:text-slate-500 line-through"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {item.name}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                        {item.category}
                      </Text>
                      {item.estimatedValue ? (
                        <Text
                          className={`text-xs font-bold ${
                            item.isBought
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-violet-700 dark:text-violet-300"
                          }`}
                        >
                          • Est: {item.estimatedValue}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>

                <View className="flex-row items-center gap-1">
                  {item.isBought && (
                    <TouchableOpacity
                      onPress={() => handleLancarNoExtrato(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/80 mr-1"
                      accessibilityLabel="Lançar compra no extrato"
                    >
                      <Text className="text-[11px] font-bold text-violet-700 dark:text-violet-300">
                        Lançar
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => removerItem(item.id)} className="p-2">
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={isDark ? "#64748b" : "#94a3b8"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
