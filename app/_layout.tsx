/**
 * app/_layout.tsx
 *
 * Layout raiz do Expo Router — Bootstrap da aplicação.
 * Adicionado carregamento de fontes (Inter) e controle de tema (Dark/Light).
 */

import { useEffect, useState } from "react";
import { useColorScheme } from "nativewind";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Font from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import "../global.css";
import { AppBootstrapper } from "../src/adapters/services/AppBootstrapper";

// Mantém a SplashScreen visível enquanto o app inicializa.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    async function initializeApp() {
      try {
        // 1. Inicializa toda a infraestrutura do app (SQLite, migrations, etc)
        await AppBootstrapper.initialize();

        // 2. Carrega fontes Inter do pacote @expo-google-fonts/inter
        try {
          await Font.loadAsync({
            Inter_400Regular,
            Inter_500Medium,
            Inter_600SemiBold,
            Inter_700Bold,
          });
        } catch {
          // Segue com fonte do sistema caso falhe
        }
      } catch (error) {
        console.error("Erro ao inicializar app:", error);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    initializeApp();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} className={isDark ? "bg-[#05050A]" : "bg-slate-50"}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: isDark ? "#05050A" : "#f8fafc" },
          headerTintColor: isDark ? "#f1f5f9" : "#0f172a",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
          contentStyle: { backgroundColor: isDark ? "#05050A" : "#f8fafc" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="shopping-list" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
