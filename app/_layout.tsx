/**
 * app/_layout.tsx
 *
 * Layout raiz do Expo Router — Bootstrap da aplicação.
 * Adicionado carregamento de fontes (Inter) e controle de tema (Dark/Light).
 */

import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Font from "expo-font";

import "../global.css";
import { AppBootstrapper } from "../src/adapters/services/AppBootstrapper";

// Mantém a SplashScreen visível enquanto o app inicializa.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    async function initializeApp() {
      try {
        // Carrega fontes
        await Font.loadAsync({
          Inter_400Regular: require("@expo-google-fonts/inter/Inter_400Regular.ttf").catch(() => null),
          Inter_500Medium: require("@expo-google-fonts/inter/Inter_500Medium.ttf").catch(() => null),
          Inter_600SemiBold: require("@expo-google-fonts/inter/Inter_600SemiBold.ttf").catch(() => null),
          Inter_700Bold: require("@expo-google-fonts/inter/Inter_700Bold.ttf").catch(() => null),
        });

        // Inicializa toda a infraestrutura do app (SQLite, etc)
        await AppBootstrapper.initialize();
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
    <GestureHandlerRootView style={{ flex: 1 }} className={isDark ? "bg-slate-950" : "bg-slate-50"}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: isDark ? "#020617" : "#f8fafc" },
          headerTintColor: isDark ? "#f1f5f9" : "#0f172a",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
          contentStyle: { backgroundColor: isDark ? "#020617" : "#f8fafc" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
