/**
 * app/(tabs)/_layout.tsx
 */

import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

interface TabIconProps {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  isDark: boolean;
}

function TabIcon({ label, iconName, focused, isDark }: TabIconProps) {
  const activeColor = isDark ? "#22d3ee" : "#0891b2"; // Cyan
  const inactiveColor = isDark ? "#64748b" : "#94a3b8";

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 4, width: "100%" }}>
      <Ionicons
        name={focused ? iconName : (String(iconName) + "-outline" as any)}
        size={22}
        color={focused ? activeColor : inactiveColor}
      />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          fontSize: 9,
          fontWeight: focused ? "700" : "500",
          color: focused ? activeColor : inactiveColor,
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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? "#040B16" : "#ffffff",
          borderTopColor: isDark ? "#1e293b" : "#e2e8f0",
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => <TabIcon label="Início" iconName="home" focused={focused} isDark={isDark} />,
        }}
      />
      <Tabs.Screen
        name="lancamentos"
        options={{
          title: "Lançamentos",
          tabBarIcon: ({ focused }) => <TabIcon label="Extrato" iconName="list" focused={focused} isDark={isDark} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Análise",
          tabBarIcon: ({ focused }) => <TabIcon label="Análise" iconName="pie-chart" focused={focused} isDark={isDark} />,
        }}
      />
      <Tabs.Screen
        name="calculadoras"
        options={{
          title: "Cálculo",
          tabBarIcon: ({ focused }) => <TabIcon label="Cálculo" iconName="calculator" focused={focused} isDark={isDark} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ focused }) => <TabIcon label="Perfil" iconName="person" focused={focused} isDark={isDark} />,
        }}
      />
    </Tabs>
  );
}
