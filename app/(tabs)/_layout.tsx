/**
 * app/(tabs)/_layout.tsx
 *
 * Layout das Tabs principais — Boundary de UI.
 *
 * Abas:
 *  1. Dashboard (index)   — icon: home
 *  2. Lançamentos         — icon: list
 *  3. Calculadoras        — icon: calculator
 *  4. Perfil              — icon: person
 */

import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface TabIconProps {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}

function TabIcon({ label, iconName, focused }: TabIconProps) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 4,
      }}
    >
      <Ionicons
        name={focused ? iconName : (String(iconName) + "-outline" as any)}
        size={22}
        color={focused ? "#7c3aed" : "#64748b"}
      />
      <Text
        style={{
          fontSize: 10,
          fontWeight: focused ? "600" : "400",
          color: focused ? "#7c3aed" : "#64748b",
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0f172a",
          borderTopColor: "#1e293b",
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: "#7c3aed",
        tabBarInactiveTintColor: "#64748b",
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Dashboard" iconName="home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="lancamentos"
        options={{
          title: "Lançamentos",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Lançamentos" iconName="list" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calculadoras"
        options={{
          title: "Calculadoras",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Ferramentas" iconName="calculator" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Perfil" iconName="person" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
