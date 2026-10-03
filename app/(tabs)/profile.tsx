/**
 * app/(tabs)/profile.tsx
 *
 * Tela: Perfil e Configurações — Boundary de UI.
 *
 * Requisitos Implementados:
 *  - Alternância REAL de Tema (Light Mode x Dark Mode) usando `useColorScheme` da NativeWind (`setColorScheme('light')` / `'dark'`).
 *  - Botão Vermelho em Destaque "Limpar Dados de Teste":
 *    Executa DELETE FROM transactions, DELETE FROM goals, refaz o Seed inicial (Poupança R$500 e Reserva da Moto R$150)
 *    e notifica os componentes.
 *  - Seleção de foto de perfil via expo-image-picker.
 */

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";

import { limparDadosUseCase } from "../../src/adapters/composition-root";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de Itens de Configuração
// ─────────────────────────────────────────────────────────────────────────────

interface ConfiguracaoItem {
  id: string;
  icone: string;
  titulo: string;
  descricao: string;
  tipo: "toggle" | "botao";
  valor?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  corIcone?: string;
  danger?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente Visual: Avatar de Perfil
// ─────────────────────────────────────────────────────────────────────────────

interface AvatarPerfilProps {
  uri: string | null;
  onAlterarFoto: () => void;
  carregando: boolean;
  isDark: boolean;
}

function AvatarPerfil({ uri, onAlterarFoto, carregando, isDark }: AvatarPerfilProps) {
  return (
    <View style={avatarStyles.container}>
      <TouchableOpacity
        style={avatarStyles.wrapper}
        onPress={onAlterarFoto}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Alterar foto de perfil"
      >
        {uri ? (
          <Image source={{ uri }} style={avatarStyles.imagem} />
        ) : (
          <View style={[avatarStyles.placeholder, { backgroundColor: isDark ? "#083344" : "#cffafe" }]}>
            <Text style={avatarStyles.placeholderTexto}>👤</Text>
          </View>
        )}
        <View style={avatarStyles.editBadge}>
          {carregando ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="camera" size={16} color="#ffffff" />
          )}
        </View>
      </TouchableOpacity>
      <Text style={[avatarStyles.nome, { color: isDark ? "#f1f5f9" : "#0f172a" }]}>Perfil do Usuário</Text>
      <Text style={avatarStyles.sub}>Toque na foto para alterar</Text>
      <TouchableOpacity
        style={[avatarStyles.alterarBtn, { backgroundColor: isDark ? "#1e293b" : "#e2e8f0" }]}
        onPress={onAlterarFoto}
      >
        <Text style={[avatarStyles.alterarBtnText, { color: isDark ? "#67e8f9" : "#0891b2" }]}>
          Alterar Foto de Perfil
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 24, gap: 6 },
  wrapper: { position: "relative" },
  imagem: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: "#0891b2" },
  placeholder: {
    width: 104, height: 104, borderRadius: 52,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#0891b2",
  },
  placeholderTexto: { fontSize: 48 },
  editBadge: {
    position: "absolute", bottom: 2, right: 2,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#0891b2",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#020617",
  },
  nome: { fontSize: 20, fontWeight: "800", marginTop: 4 },
  sub: { fontSize: 13, color: "#64748b" },
  alterarBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#a855f7",
  },
  alterarBtnText: { fontSize: 12, fontWeight: "700" },
});

// ─────────────────────────────────────────────────────────────────────────────
// Componente Visual: Card de Configuração
// ─────────────────────────────────────────────────────────────────────────────

function ConfigCard({ item, isDark }: { item: ConfiguracaoItem; isDark: boolean }) {
  const isDanger = item.danger;

  return (
    <TouchableOpacity
      style={[
        configStyles.card,
        {
          backgroundColor: isDanger ? (isDark ? "#1c0a12" : "#fef2f2") : isDark ? "#0f172a" : "#ffffff",
          borderColor: isDanger ? "#f43f5e" : isDark ? "#1e293b" : "#e2e8f0",
        },
      ]}
      onPress={item.tipo === "botao" ? item.onPress : undefined}
      activeOpacity={item.tipo === "botao" ? 0.7 : 1}
    >
      <View
        style={[
          configStyles.iconBg,
          {
            backgroundColor: isDanger
              ? "rgba(244, 63, 94, 0.2)"
              : item.corIcone
              ? `${item.corIcone}20`
              : isDark
              ? "#1e293b"
              : "#f1f5f9",
          },
        ]}
      >
        <Text style={configStyles.icone}>{item.icone}</Text>
      </View>
      <View style={configStyles.textos}>
        <Text
          style={[
            configStyles.titulo,
            { color: isDanger ? "#f43f5e" : isDark ? "#f1f5f9" : "#0f172a" },
          ]}
        >
          {item.titulo}
        </Text>
        <Text style={[configStyles.descricao, isDanger && { color: "#f87171" }]}>
          {item.descricao}
        </Text>
      </View>
      {item.tipo === "toggle" && item.onToggle && (
        <Switch
          value={item.valor ?? false}
          onValueChange={item.onToggle}
          trackColor={{ false: isDark ? "#1e293b" : "#cbd5e1", true: "#4c1d95" }}
          thumbColor={item.valor ? "#0891b2" : "#94a3b8"}
        />
      )}
      {item.tipo === "botao" && (
        <Ionicons name="chevron-forward" size={20} color={isDanger ? "#f43f5e" : "#94a3b8"} />
      )}
    </TouchableOpacity>
  );
}

const configStyles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 16, padding: 16, borderWidth: 1,
  },
  iconBg: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  icone: { fontSize: 22 },
  textos: { flex: 1 },
  titulo: { fontSize: 15, fontWeight: "700" },
  descricao: { fontSize: 12, color: "#64748b", marginTop: 2 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Tela Principal de Perfil
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme !== "light";

  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [carregandoFoto, setCarregandoFoto] = useState(false);
  const [limpando, setLimpando] = useState(false);

  // Alterar foto de perfil via expo-image-picker
  const handleAlterarFoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissão necessária",
        "Precisamos de permissão de acesso à sua galeria de fotos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setCarregandoFoto(true);
      setTimeout(() => {
        setFotoPerfil(result.assets[0].uri);
        setCarregandoFoto(false);
      }, 600);
    }
  }, []);

  // Alternância REAL de Tema com NativeWind (setColorScheme)
  const handleDarkModeToggle = useCallback(
    (ativarDark: boolean) => {
      setColorScheme(ativarDark ? "dark" : "light");
    },
    [setColorScheme]
  );

  // Botão Limpar Dados de Teste
  const handleLimparDados = useCallback(() => {
    Alert.alert(
      "Limpar Dados de Teste",
      "Esta ação apagará TODAS as transações e caixinhas e restaurará as caixinhas padrão ('Poupança' R$500 e 'Reserva da Moto' R$150). Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar Tudo",
          style: "destructive",
          onPress: async () => {
            setLimpando(true);
            try {
              await limparDadosUseCase.executar();
              Alert.alert("Sucesso 🎉", "Dados de teste limpos e caixinhas padrão restauradas!");
            } catch (e) {
              Alert.alert("Erro", "Falha ao limpar dados.");
            } finally {
              setLimpando(false);
            }
          },
        },
      ]
    );
  }, []);

  const configuracoes: ConfiguracaoItem[] = [
    {
      id: "darkmode",
      icone: isDark ? "🌙" : "☀️",
      titulo: isDark ? "Dark Mode" : "Light Mode",
      descricao: "Alternar entre tema escuro e claro do aplicativo",
      tipo: "toggle",
      valor: isDark,
      onToggle: handleDarkModeToggle,
      corIcone: "#0891b2",
    },
    {
      id: "backup",
      icone: "☁️",
      titulo: "Sincronização em Nuvem",
      descricao: "Sincronizar dados com o Supabase",
      tipo: "toggle",
      valor: false,
      onToggle: () => {},
      corIcone: "#3b82f6",
    },
    {
      id: "limpar",
      icone: "🔄",
      titulo: "Limpar Dados de Teste",
      descricao: "Apagar transações e recriar caixinhas",
      tipo: "botao",
      danger: false,
      onPress: handleLimparDados,
    },
  ];

  const themeBg = isDark ? "#020617" : "#f8fafc";
  const cardBg = isDark ? "#0f172a" : "#ffffff";
  const cardBorder = isDark ? "#1e293b" : "#e2e8f0";
  const titleColor = isDark ? "#f1f5f9" : "#0f172a";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeBg }]}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: themeBg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: titleColor }]}>Perfil 👤</Text>
          <Text style={styles.pageSubtitle}>Gerencie suas preferências e conta</Text>
        </View>

        {/* Card de Avatar & Foto */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <AvatarPerfil
            uri={fotoPerfil}
            onAlterarFoto={handleAlterarFoto}
            carregando={carregandoFoto}
            isDark={isDark}
          />
        </View>

        {/* Seção: Aparência e Notificações */}
        <Text style={styles.sectionTitle}>Aparência e Preferências</Text>
        <View style={styles.section}>
          {configuracoes.slice(0, 2).map((item) => (
            <ConfigCard key={item.id} item={item} isDark={isDark} />
          ))}
        </View>

        {/* Seção: Manutenção e Limpeza */}
        <Text style={styles.sectionTitle}>Manutenção do Banco de Dados</Text>
        <View style={styles.section}>
          <ConfigCard item={configuracoes[2]} isDark={isDark} />
        </View>

        {/* Rodapé Informativo */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoNome, { color: titleColor }]}>💰 Controle Financeiro Pessoal</Text>
          <Text style={styles.appInfoVersao}>Versão 1.0.0 • NativeWind Mode ({isDark ? "Dark" : "Light"})</Text>
          <Text style={styles.appInfoTech}>
            React Native • Clean Architecture • SQLite
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estilos Globais da Tela de Perfil
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 18, paddingTop: 8, gap: 14 },

  pageHeader: { marginBottom: 4 },
  pageTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },

  card: {
    borderRadius: 20,
    borderWidth: 1,
  },

  sectionTitle: {
    fontSize: 12, fontWeight: "700", color: "#0891b2",
    textTransform: "uppercase", letterSpacing: 1, marginTop: 8,
  },
  section: { gap: 10 },

  appInfo: {
    alignItems: "center", paddingVertical: 24, gap: 4, marginTop: 12,
  },
  appInfoNome: { fontSize: 15, fontWeight: "700" },
  appInfoVersao: { fontSize: 12, color: "#64748b" },
  appInfoTech: { fontSize: 11, color: "#475569", marginTop: 2 },
});
