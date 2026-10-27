/**
 * app/(tabs)/profile.tsx
 *
 * Tela: Perfil, Conta Multi-Usuário e Configurações — Boundary de UI.
 *
 * Funcionalidades:
 *  - Gerenciamento completo de Conta (Criar Conta, Entrar, Editar Nome, Foto de Perfil e Sair)
 *    com persistência Offline-First em `expo-secure-store` + integração Supabase Auth.
 *  - Sincronização em Nuvem real acionando a fila de transações e metas pendentes.
 *  - Alternância de Tema (Dark Mode Preto & Roxo x Light Mode Branco & Roxo).
 *  - Limpeza de Dados de Teste com restauração de seed inicial.
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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { limparDadosUseCase } from "../../src/adapters/composition-root";
import { useUserAccount } from "../../src/adapters/hooks/useUserAccount";

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
// Modal de Conta (Entrar / Criar Conta / Editar Nome)
// ─────────────────────────────────────────────────────────────────────────────

interface ModalContaProps {
  visible: boolean;
  isDark: boolean;
  nomeAtual: string;
  emailAtual: string;
  isAuthenticated: boolean;
  onClose: () => void;
  onSalvarNome: (nome: string) => Promise<void>;
  onEntrar: (email: string, senha: string) => Promise<void>;
  onCadastrar: (nome: string, email: string, senha: string) => Promise<void>;
  onSair: () => Promise<void>;
}

function ModalContaUsuario({
  visible,
  isDark,
  nomeAtual,
  emailAtual,
  isAuthenticated,
  onClose,
  onSalvarNome,
  onEntrar,
  onCadastrar,
  onSair,
}: ModalContaProps) {
  const [aba, setAba] = useState<"perfil" | "login" | "cadastro">(
    isAuthenticated ? "perfil" : "cadastro"
  );
  const [nome, setNome] = useState(nomeAtual);
  const [email, setEmail] = useState(emailAtual);
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setNome(nomeAtual);
    setEmail(emailAtual);
    setErro(null);
  }, [nomeAtual, emailAtual, visible]);

  const handleExecutar = async () => {
    setErro(null);
    setSalvando(true);
    try {
      if (aba === "perfil") {
        await onSalvarNome(nome);
        onClose();
      } else if (aba === "login") {
        await onEntrar(email, senha);
        setSenha("");
        onClose();
      } else {
        await onCadastrar(nome, email, senha);
        setSenha("");
        onClose();
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar conta.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/70"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={{
            backgroundColor: isDark ? "#090d16" : "#ffffff",
            borderColor: isDark ? "#2e1065" : "#ede9fe",
          }}
          className="rounded-t-3xl p-6 border-t"
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-extrabold text-slate-900 dark:text-white">
              Minha Conta 👤
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={24} color={isDark ? "#c4b5fd" : "#7c3aed"} />
            </TouchableOpacity>
          </View>

          {/* Seletor de Abas da Conta */}
          <View className="flex-row bg-slate-100 dark:bg-[#131129] rounded-xl p-1 mb-5 border border-violet-200/60 dark:border-violet-900/60">
            <TouchableOpacity
              onPress={() => {
                setAba("perfil");
                setErro(null);
              }}
              className={`flex-1 py-2.5 rounded-lg items-center ${
                aba === "perfil" ? "bg-violet-600" : ""
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  aba === "perfil" ? "text-white" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Editar Nome
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setAba("cadastro");
                setErro(null);
              }}
              className={`flex-1 py-2.5 rounded-lg items-center ${
                aba === "cadastro" ? "bg-violet-600" : ""
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  aba === "cadastro" ? "text-white" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Criar Conta
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setAba("login");
                setErro(null);
              }}
              className={`flex-1 py-2.5 rounded-lg items-center ${
                aba === "login" ? "bg-violet-600" : ""
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  aba === "login" ? "text-white" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Entrar
              </Text>
            </TouchableOpacity>
          </View>

          {(aba === "perfil" || aba === "cadastro") && (
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Como você quer ser chamado?
              </Text>
              <TextInput
                className="bg-slate-50 dark:bg-[#131129] rounded-xl p-4 text-slate-900 dark:text-white font-semibold border border-violet-200 dark:border-violet-900/80"
                value={nome}
                onChangeText={setNome}
                placeholder="Ex: Victor, Ana, Lucas..."
                placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
              />
            </View>
          )}

          {(aba === "login" || aba === "cadastro") && (
            <>
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Seu E-mail
                </Text>
                <TextInput
                  className="bg-slate-50 dark:bg-[#131129] rounded-xl p-4 text-slate-900 dark:text-white font-semibold border border-violet-200 dark:border-violet-900/80"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="seuemail@exemplo.com"
                  placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Senha
                </Text>
                <TextInput
                  className="bg-slate-50 dark:bg-[#131129] rounded-xl p-4 text-slate-900 dark:text-white font-semibold border border-violet-200 dark:border-violet-900/80"
                  value={senha}
                  onChangeText={setSenha}
                  placeholder="Mínimo de 4 caracteres"
                  placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                  secureTextEntry
                />
              </View>
            </>
          )}

          <View className="bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-900/50 rounded-xl p-3 mb-4">
            <Text className="text-xs text-slate-600 dark:text-slate-300 leading-5">
              🔒 Seus dados funcionam no modo **Offline-First**: você pode acessar e lançar gastos com ou sem internet a qualquer momento.
            </Text>
          </View>

          {erro && (
            <Text className="text-xs font-bold text-orange-500 dark:text-orange-400 mb-3">
              ⚠️ {erro}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleExecutar}
            disabled={salvando}
            className="bg-violet-600 py-4 rounded-xl items-center shadow-md"
          >
            {salvando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-base">
                {aba === "perfil"
                  ? "✓ Salvar Nome"
                  : aba === "login"
                  ? "→ Entrar na Conta"
                  : "✓ Criar Minha Conta"}
              </Text>
            )}
          </TouchableOpacity>

          {isAuthenticated && (
            <TouchableOpacity
              onPress={async () => {
                await onSair();
                onClose();
              }}
              className="mt-3 py-3 rounded-xl items-center border border-orange-400/50"
            >
              <Text className="text-xs font-bold text-orange-500 dark:text-orange-400">
                Sair da Conta Atual
              </Text>
            </TouchableOpacity>
          )}

          <View className="h-4" />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente Visual: Avatar de Perfil e Status da Conta
// ─────────────────────────────────────────────────────────────────────────────

interface AvatarPerfilProps {
  nome: string;
  email: string;
  isAuthenticated: boolean;
  uri: string | null;
  onAlterarFoto: () => void;
  onAbrirModalConta: () => void;
  carregando: boolean;
  isDark: boolean;
}

function AvatarPerfil({
  nome,
  email,
  isAuthenticated,
  uri,
  onAlterarFoto,
  onAbrirModalConta,
  carregando,
  isDark,
}: AvatarPerfilProps) {
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
          <View style={[avatarStyles.placeholder, { backgroundColor: isDark ? "#2e1065" : "#f3e8ff" }]}>
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

      <Text style={[avatarStyles.nome, { color: isDark ? "#f1f5f9" : "#0f172a" }]}>
        {nome || "Usuário"}
      </Text>
      <Text style={avatarStyles.sub}>
        {email ? `${email} • Conta Ativa` : "Modo Local Offline-First"}
      </Text>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
        <TouchableOpacity
          style={[avatarStyles.alterarBtn, { backgroundColor: isDark ? "#131129" : "#f3e8ff" }]}
          onPress={onAlterarFoto}
        >
          <Text style={[avatarStyles.alterarBtnText, { color: isDark ? "#c4b5fd" : "#7c3aed" }]}>
            📷 Foto
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[avatarStyles.alterarBtn, { backgroundColor: "#7c3aed" }]}
          onPress={onAbrirModalConta}
        >
          <Text style={[avatarStyles.alterarBtnText, { color: "#ffffff" }]}>
            {isAuthenticated ? "⚙️ Gerenciar Conta" : "🔑 Entrar / Criar Conta"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 24, gap: 4 },
  wrapper: { position: "relative" },
  imagem: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: "#8b5cf6" },
  placeholder: {
    width: 104, height: 104, borderRadius: 52,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#8b5cf6",
  },
  placeholderTexto: { fontSize: 48 },
  editBadge: {
    position: "absolute", bottom: 2, right: 2,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#7c3aed",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#05050A",
  },
  nome: { fontSize: 20, fontWeight: "800", marginTop: 4 },
  sub: { fontSize: 13, color: "#64748b" },
  alterarBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#8b5cf6",
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
          backgroundColor: isDanger ? (isDark ? "#2a1205" : "#fff7ed") : isDark ? "#090d16" : "#ffffff",
          borderColor: isDanger ? "#fb923c" : isDark ? "#2e1065" : "#ede9fe",
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
              ? "rgba(251, 146, 60, 0.2)"
              : item.corIcone
              ? `${item.corIcone}20`
              : isDark
              ? "#131129"
              : "#f5f3ff",
          },
        ]}
      >
        <Text style={configStyles.icone}>{item.icone}</Text>
      </View>
      <View style={configStyles.textos}>
        <Text
          style={[
            configStyles.titulo,
            { color: isDanger ? "#fb923c" : isDark ? "#f1f5f9" : "#0f172a" },
          ]}
        >
          {item.titulo}
        </Text>
        <Text style={[configStyles.descricao, isDanger && { color: "#fdba74" }]}>
          {item.descricao}
        </Text>
      </View>
      {item.tipo === "toggle" && item.onToggle && (
        <Switch
          value={item.valor ?? false}
          onValueChange={item.onToggle}
          trackColor={{ false: isDark ? "#1e1b4b" : "#cbd5e1", true: "#7c3aed" }}
          thumbColor={item.valor ? "#c4b5fd" : "#94a3b8"}
        />
      )}
      {item.tipo === "botao" && (
        <Ionicons name="chevron-forward" size={20} color={isDanger ? "#fb923c" : "#a78bfa"} />
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
  const router = useRouter();

  const {
    user,
    sincronizando,
    entrar,
    cadastrar,
    atualizarPerfil,
    sair,
    sincronizarAgora,
  } = useUserAccount();

  const [carregandoFoto, setCarregandoFoto] = useState(false);
  const [_limpando, setLimpando] = useState(false);
  const [modalContaVisible, setModalContaVisible] = useState(false);

  // Alterar foto de perfil via expo-image-picker e persistir na conta do usuário
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
      await atualizarPerfil({ avatarUri: result.assets[0].uri });
      setCarregandoFoto(false);
    }
  }, [atualizarPerfil]);

  const handleDarkModeToggle = useCallback(
    (ativarDark: boolean) => {
      setColorScheme(ativarDark ? "dark" : "light");
    },
    [setColorScheme]
  );

  const handleCloudSyncToggle = useCallback(
    async (ativar: boolean) => {
      await atualizarPerfil({ cloudSyncEnabled: ativar });
      if (ativar) {
        const res = await sincronizarAgora();
        Alert.alert("Sincronização", res.mensagem);
      }
    },
    [atualizarPerfil, sincronizarAgora]
  );

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
            } catch {
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
      id: "conta",
      icone: "👤",
      titulo: "Dados da Conta e Nome",
      descricao: user?.email
        ? `Conectado como ${user.name} (${user.email})`
        : `Exibindo como "${user?.name ?? "Victor"}" • Toque para alterar ou criar conta`,
      tipo: "botao",
      onPress: () => setModalContaVisible(true),
      corIcone: "#8b5cf6",
    },
    {
      id: "darkmode",
      icone: isDark ? "🌙" : "☀️",
      titulo: isDark ? "Dark Mode (Preto & Roxo)" : "Light Mode (Branco & Roxo)",
      descricao: "Alternar entre tema escuro e claro do aplicativo",
      tipo: "toggle",
      valor: isDark,
      onToggle: handleDarkModeToggle,
      corIcone: "#8b5cf6",
    },
    {
      id: "backup",
      icone: sincronizando ? "⏳" : "☁️",
      titulo: "Sincronização em Nuvem",
      descricao: user?.cloudSyncEnabled
        ? "Ativa • Sincronizando automaticamente com sua conta"
        : "Ative para sincronizar seus dados locais com o Supabase",
      tipo: "toggle",
      valor: user?.cloudSyncEnabled ?? false,
      onToggle: handleCloudSyncToggle,
      corIcone: "#a855f7",
    },
    {
      id: "shopping-list",
      icone: "🛒",
      titulo: "Anotações de Compras",
      descricao: "Lista de desejos e planejamento",
      tipo: "botao",
      danger: false,
      onPress: () => router.push("/shopping-list"),
      corIcone: "#7c3aed",
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

  const themeBg = isDark ? "#05050A" : "#f8fafc";
  const cardBg = isDark ? "#090d16" : "#ffffff";
  const cardBorder = isDark ? "#2e1065" : "#ede9fe";
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
          <Text style={[styles.pageTitle, { color: titleColor }]}>Perfil & Conta 👤</Text>
          <Text style={styles.pageSubtitle}>Gerencie seu usuário, tema e dados</Text>
        </View>

        {/* Card de Avatar & Conta */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <AvatarPerfil
            nome={user?.name ?? "Victor"}
            email={user?.email ?? ""}
            isAuthenticated={user?.isAuthenticated ?? false}
            uri={user?.avatarUri ?? null}
            onAlterarFoto={handleAlterarFoto}
            onAbrirModalConta={() => setModalContaVisible(true)}
            carregando={carregandoFoto}
            isDark={isDark}
          />
        </View>

        {/* Seção: Conta, Aparência e Nuvem */}
        <Text style={styles.sectionTitle}>Conta e Preferências</Text>
        <View style={styles.section}>
          {configuracoes.slice(0, 4).map((item) => (
            <ConfigCard key={item.id} item={item} isDark={isDark} />
          ))}
        </View>

        {/* Seção: Manutenção e Limpeza */}
        <Text style={styles.sectionTitle}>Manutenção do Banco de Dados</Text>
        <View style={styles.section}>
          <ConfigCard item={configuracoes[4]} isDark={isDark} />
        </View>

        {/* Rodapé Informativo */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoNome, { color: titleColor }]}>💰 Controle Financeiro Pessoal</Text>
          <Text style={styles.appInfoVersao}>
            Versão 1.0.0 • Tema {isDark ? "Dark (Preto & Roxo)" : "Light (Branco & Roxo)"}
          </Text>
          <Text style={styles.appInfoTech}>
            Offline-First • SQLite • IA Financeira Custo Zero
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ModalContaUsuario
        visible={modalContaVisible}
        isDark={isDark}
        nomeAtual={user?.name ?? "Victor"}
        emailAtual={user?.email ?? ""}
        isAuthenticated={user?.isAuthenticated ?? false}
        onClose={() => setModalContaVisible(false)}
        onSalvarNome={async (novoNome) => {
          await atualizarPerfil({ name: novoNome });
        }}
        onEntrar={async (email, senha) => {
          await entrar(email, senha);
        }}
        onCadastrar={async (nome, email, senha) => {
          await cadastrar(nome, email, senha);
        }}
        onSair={async () => {
          await sair();
        }}
      />
    </SafeAreaView>
  );
}

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
    fontSize: 12, fontWeight: "700", color: "#8b5cf6",
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
