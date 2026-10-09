import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

type Category = 'Todos' | 'Mercado' | 'Desejos/Roupas';

interface ShoppingItem {
  id: string;
  name: string;
  estimatedValue: string;
  isBought: boolean;
  category: Category;
}

export default function ShoppingListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newEstimatedValue, setNewEstimatedValue] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('Todos');

  const categories: Category[] = ['Todos', 'Mercado', 'Desejos/Roupas'];

  const handleAddItem = () => {
    if (!newItemName.trim()) return;

    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      estimatedValue: newEstimatedValue.trim(),
      isBought: false,
      category: activeCategory === 'Todos' ? 'Mercado' : activeCategory,
    };

    setItems([newItem, ...items]);
    setNewItemName('');
    setNewEstimatedValue('');
  };

  const toggleBought = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, isBought: !item.isBought } : item));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const filteredItems = items.filter(item => activeCategory === 'Todos' || item.category === activeCategory);

  const formatCurrencyInput = (text: string) => {
    // A simple formatter for the estimated value
    const numericValue = text.replace(/[^0-9]/g, '');
    if (numericValue === '') return '';
    const floatValue = parseFloat(numericValue) / 100;
    return floatValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0B0E14]">
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ paddingTop: insets.top, paddingHorizontal: 20 }} className="pb-4">
          {/* HEADER */}
          <View className="flex-row items-center justify-between mb-6 mt-2">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full bg-slate-200 dark:bg-[#161B22]">
              <Ionicons name="arrow-back" size={24} color={isDark ? "#22d3ee" : "#0891b2"} />
            </TouchableOpacity>
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-extrabold text-slate-900 dark:text-white">Lista de Compras</Text>
              <MaterialCommunityIcons name="cart-outline" size={24} color={isDark ? "#22d3ee" : "#0891b2"} />
            </View>
            <View className="w-10" /> {/* Spacer for centering */}
          </View>

          {/* TABS DE CATEGORIA */}
          <View className="flex-row gap-2 mb-6">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl border ${
                  activeCategory === cat 
                    ? 'bg-cyan-100 border-cyan-400 dark:bg-cyan-900/40 dark:border-cyan-500' 
                    : 'bg-white border-slate-200 dark:bg-[#161B22] dark:border-[#161B22]'
                }`}
              >
                <Text className={`font-semibold text-sm ${
                  activeCategory === cat 
                    ? 'text-cyan-700 dark:text-cyan-300' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* FORMULÁRIO DE ADIÇÃO */}
          <View className="bg-white dark:bg-[#161B22] rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-[#161B22] mb-4">
            <TextInput
              className="font-medium text-base text-slate-900 dark:text-white mb-3"
              placeholder="Ex: Tênis novo, Compra do mês"
              placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
              value={newItemName}
              onChangeText={setNewItemName}
            />
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 flex-row items-center bg-slate-50 dark:bg-[#0B0E14] rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-800">
                <MaterialCommunityIcons name="currency-brl" size={18} color={isDark ? "#475569" : "#94a3b8"} />
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
                className="bg-cyan-600 rounded-xl px-5 py-3 items-center justify-center flex-row gap-2 shadow-sm shadow-cyan-500/30"
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text className="text-white font-bold">Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* LISTAGEM DE ITENS */}
        <ScrollView 
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {filteredItems.length === 0 ? (
            <View className="items-center justify-center mt-10">
              <MaterialCommunityIcons name="cart-remove" size={64} color={isDark ? "#161B22" : "#e2e8f0"} />
              <Text className="text-slate-500 dark:text-slate-400 mt-4 font-medium text-center">
                Nenhum item adicionado em "{activeCategory}".
              </Text>
            </View>
          ) : (
            filteredItems.map(item => (
              <View 
                key={item.id} 
                className={`flex-row items-center justify-between bg-white dark:bg-[#161B22] p-4 rounded-2xl mb-3 border ${
                  item.isBought 
                    ? 'border-cyan-200 dark:border-cyan-900/50 opacity-70' 
                    : 'border-slate-200 dark:border-[#161B22]'
                } shadow-sm`}
              >
                <TouchableOpacity 
                  onPress={() => toggleBought(item.id)}
                  className="flex-row items-center flex-1 gap-3"
                >
                  <View className={`w-6 h-6 rounded-md items-center justify-center border ${
                    item.isBought 
                      ? 'bg-cyan-500 border-cyan-500' 
                      : 'bg-transparent border-slate-300 dark:border-slate-600'
                  }`}>
                    {item.isBought && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold text-base ${
                      item.isBought 
                        ? 'text-slate-400 dark:text-slate-500 line-through' 
                        : 'text-slate-900 dark:text-white'
                    }`}>
                      {item.name}
                    </Text>
                    {item.estimatedValue ? (
                      <Text className={`text-xs mt-1 font-medium ${
                        item.isBought ? 'text-slate-400 dark:text-slate-600' : 'text-cyan-700 dark:text-cyan-400'
                      }`}>
                        Est: {item.estimatedValue}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => deleteItem(item.id)} className="p-2">
                  <Ionicons name="trash-outline" size={20} color={isDark ? "#475569" : "#94a3b8"} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
