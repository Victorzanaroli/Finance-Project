/**
 * app/(tabs)/lancamentos.tsx
 *
 * Tela: Lançamentos — Registro e listagem de transações com Clean Architecture.
 * Boundary de UI.
 *
 * Requisitos Implementados:
 *  1. Limpeza total de Picker e ScrollView de chips residuais.
 *  2. Modal Customizado de Seleção de Categoria:
 *     - Botão "Selecionar Categoria" abre Modal nativo com lista de opções + Ícones do @expo/vector-icons.
 *     - Opções de Receita: Salário (cash), Freelancer (car), Outros (ellipsis-horizontal).
 *     - Opções de Despesa: Lazer (game-controller), Alimentação (fast-food), Assinaturas (tv), Saúde (medkit), Casa (home), Poupança (wallet), Reserva da Moto (motorcycle).
 *     - Opção "Transporte" excluída.
 *  3. Histórico de Transações com os mesmos ícones vetoriais.
 *  4. Leitor de Faturas via expo-camera (Escanear Conta + simulador OCR de 2 segundos).
 */

import { useColorScheme } from "nativewind";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useRef, useCallback, useEffect } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useRegistrarTransacao } from "../../src/adapters/hooks/useRegistrarTransacao";
import { useTransacoes } from "../../src/adapters/hooks/useTransacoes";
import type { Transaction, TransactionType } from "../../src/domain/entities/Transaction";
import { getQuintoDiaUtil } from "../../src/domain/value-objects/DataFinanceira";

// Gateway isolado de Câmera (Clean Architecture)
import {
  CameraView,
  useCameraPermissions,
  cameraGateway,
} from "../../src/adapters/gateways/camera/CameraGateway";

// ─────────────────────────────────────────────────────────────────────────────
// Estrutura e Ícones das Categorias Customizadas
// ─────────────────────────────────────────────────────────────────────────────

export interface CategoriaOption {
  label: string;
  iconName: string;
  iconFamily: "Ionicons" | "MaterialCommunityIcons";
  color: string;
}

const CATEGORIAS_RECEITA: CategoriaOption[] = [
  { label: "Salário", iconName: "briefcase-outline", iconFamily: "Ionicons", color: "#34d399" },
  { label: "Freelancer", iconName: "laptop-outline", iconFamily: "Ionicons", color: "#34d399" },
  { label: "Outros", iconName: "grid-outline", iconFamily: "Ionicons", color: "#94a3b8" },
];

const CATEGORIAS_DESPESA: CategoriaOption[] = [
  { label: "Lazer", iconName: "airplane-outline", iconFamily: "Ionicons", color: "#ec4899" },
  { label: "Alimentação", iconName: "restaurant-outline", iconFamily: "Ionicons", color: "#f97316" },
  { label: "Assinaturas", iconName: "film-outline", iconFamily: "Ionicons", color: "#14b8a6" },
  { label: "Saúde", iconName: "heart-outline", iconFamily: "Ionicons", color: "#ef4444" },
  { label: "Casa", iconName: "home-outline", iconFamily: "Ionicons", color: "#3b82f6" },
  { label: "Poupança", iconName: "shield-checkmark-outline", iconFamily: "Ionicons", color: "#67e8f9" },
  { label: "Reserva da Moto", iconName: "construct-outline", iconFamily: "Ionicons", color: "#f59e0b" },
];

function getCategoryOption(label: string): CategoriaOption {
  const all = [...CATEGORIAS_RECEITA, ...CATEGORIAS_DESPESA];
  return (
    all.find((c) => c.label.toLowerCase() === label.toLowerCase()) ?? {
      label,
      iconName: "pricetag",
      iconFamily: "Ionicons",
      color: "#94a3b8",
    }
  );
}

function renderCategoryIcon(categoryLabel: string, size = 20) {
  const opt = getCategoryOption(categoryLabel);
  if (opt.iconFamily === "MaterialCommunityIcons") {
    return (
      <MaterialCommunityIcons
        name={opt.iconName as any}
        size={size}
        color={opt.color}
      />
    );
  }
  return <Ionicons name={opt.iconName as any} size={size} color={opt.color} />;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatarData(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("T")[0].split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente de Câmera (Leitor de Faturas com expo-camera)
// ─────────────────────────────────────────────────────────────────────────────

interface CameraScreenProps {
  onCapturaConcluida: (titulo: string, valor: string, categoria: string) => void;
  onFechar: () => void;
}

function CameraScreen({ onCapturaConcluida, onFechar }: CameraScreenProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const camStyles = getCamStyles(isDark);

  const [permission, requestPermission] = useCameraPermissions();
  const [processando, setProcessando] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleTirarFoto = useCallback(async () => {
    setProcessando(true);
    try {
      await cameraGateway.tirarFoto(cameraRef);
      setTimeout(() => {
        setProcessando(false);
        onCapturaConcluida("Conta de Luz", "150.00", "Casa");
      }, 2000);
    } catch {
      setTimeout(() => {
        setProcessando(false);
        onCapturaConcluida("Conta de Luz", "150.00", "Casa");
      }, 2000);
    }
  }, [onCapturaConcluida]);

  if (!permission) {
    return (
      <View style={camStyles.container}>
        <ActivityIndicator color="#0891b2" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={camStyles.container}>
        <Ionicons name="camera" size={48} color="#0891b2" style={{ alignSelf: "center", marginBottom: 16 }} />
        <Text style={camStyles.permTitle}>Permissão de Câmera Necessária</Text>
        <Text style={camStyles.permSubtitle}>
          Precisamos de acesso à sua câmera para escanear contas e faturas automaticamente.
        </Text>
        <TouchableOpacity style={camStyles.permBtn} onPress={requestPermission}>
          <Text style={camStyles.permBtnText}>Conceder Permissão</Text>
        </TouchableOpacity>
        <TouchableOpacity style={camStyles.cancelBtn} onPress={onFechar}>
          <Text style={camStyles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={camStyles.container}>
      <CameraView ref={cameraRef} style={camStyles.camera} facing="back">
        <View style={camStyles.overlay}>
          <View style={camStyles.topBar}>
            <TouchableOpacity style={camStyles.fecharBtn} onPress={onFechar}>
              <Text style={camStyles.fecharBtnText}>✕ Cancelar</Text>
            </TouchableOpacity>
            <Text style={camStyles.topTitle}>Escanear Conta</Text>
          </View>

          <View style={camStyles.mira}>
            <View style={[camStyles.corner, camStyles.cornerTL]} />
            <View style={[camStyles.corner, camStyles.cornerTR]} />
            <View style={[camStyles.corner, camStyles.cornerBL]} />
            <View style={[camStyles.corner, camStyles.cornerBR]} />
            <Text style={camStyles.miraText}>
              {processando ? "🔍 Processando OCR..." : "Aponte para a conta ou boleto"}
            </Text>
          </View>

          {processando ? (
            <View style={camStyles.processandoContainer}>
              <ActivityIndicator color="#0891b2" size="large" />
              <Text style={camStyles.processandoTitle}>Lendo dados da fatura...</Text>
              <Text style={camStyles.processandoSub}>Aguarde 2 segundos para auto-preenchimento</Text>
            </View>
          ) : (
            <View style={camStyles.bottomBar}>
              <TouchableOpacity style={camStyles.capturaBtn} onPress={handleTirarFoto} activeOpacity={0.8}>
                <View style={camStyles.capturaBtnInner} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const getCamStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? "#020617" : "#f8fafc", justifyContent: "center" },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: isDark ? isDark ? "rgba(2, 6, 23, 0.85)" : "rgba(2, 6, 23, 0.5)" : "rgba(2, 6, 23, 0.4)", justifyContent: "space-between", padding: 24 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 40 },
  topTitle: { color: isDark ? "#f1f5f9" : "#0f172a", fontSize: 16, fontWeight: "700" },
  fecharBtn: { padding: 8 },
  fecharBtnText: { color: "#94a3b8", fontSize: 14, fontWeight: "600" },
  mira: {
    alignSelf: "center",
    width: 280, height: 180,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  corner: { position: "absolute", width: 28, height: 28, borderColor: "#0891b2", borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  miraText: { color: isDark ? "#ffffff" : "#0f172a", fontSize: 13, textAlign: "center", fontWeight: "600", marginTop: 80 },
  bottomBar: { alignItems: "center", paddingBottom: 32 },
  capturaBtn: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 4, borderColor: isDark ? "#ffffff" : "#0f172a",
  },
  capturaBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? "#ffffff" : "#0f172a" },
  processandoContainer: { alignItems: "center", gap: 8, paddingBottom: 40 },
  processandoTitle: { color: isDark ? "#ffffff" : "#0f172a", fontSize: 16, fontWeight: "700" },
  processandoSub: { color: "#67e8f9", fontSize: 12 },
  permTitle: { fontSize: 20, fontWeight: "700", color: isDark ? "#f1f5f9" : "#0f172a", textAlign: "center", marginBottom: 12 },
  permSubtitle: { fontSize: 14, color: "#94a3b8", textAlign: "center", marginBottom: 24, paddingHorizontal: 20, lineHeight: 20 },
  permBtn: { backgroundColor: "#0891b2", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginBottom: 12, alignItems: "center" },
  permBtnText: { color: isDark ? "#ffffff" : "#0f172a", fontWeight: "700", fontSize: 15 },
  cancelBtn: { paddingVertical: 10, alignItems: "center" },
  cancelBtnText: { color: isDark ? "#64748b" : "#94a3b8", fontSize: 14 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Modal Customizado de Seleção de Categoria (Ícones + Texto em Lista)
// ─────────────────────────────────────────────────────────────────────────────

interface ModalSelecaoCategoriaProps {
  visible: boolean;
  type: TransactionType;
  categoriaAtual: string;
  onClose: () => void;
  onSelect: (catLabel: string) => void;
}

function ModalSelecaoCategoria({
  visible,
  type,
  categoriaAtual,
  onClose,
  onSelect,
}: ModalSelecaoCategoriaProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const catModalStyles = getCatModalStyles(isDark);

  const opcoes = type === "income" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={catModalStyles.overlay}>
        <View style={catModalStyles.cardModal}>
          <View style={catModalStyles.header}>
            <Text style={catModalStyles.titulo}>
              Selecionar Categoria ({type === "income" ? "Receitas" : "Despesas"})
            </Text>
            <TouchableOpacity onPress={onClose} style={catModalStyles.closeBtn}>
              <Text style={catModalStyles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 360 }}>
            {opcoes.map((opt) => {
              const selecionada = categoriaAtual === opt.label;
              return (
                <TouchableOpacity
                  key={opt.label}
                  style={[
                    catModalStyles.itemRow,
                    selecionada && catModalStyles.itemRowSelected,
                  ]}
                  onPress={() => {
                    onSelect(opt.label);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={catModalStyles.iconContainer}>
                    {renderCategoryIcon(opt.label, 22)}
                  </View>
                  <Text style={[catModalStyles.itemText, selecionada && catModalStyles.itemTextSelected]}>
                    {opt.label}
                  </Text>
                  {selecionada && (
                    <Ionicons name="checkmark-circle" size={22} color="#0891b2" style={{ marginLeft: "auto" }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const getCatModalStyles = (isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: isDark ? "rgba(2, 6, 23, 0.85)" : "rgba(2, 6, 23, 0.5)",
    justifyContent: "flex-end",
  },
  cardModal: {
    backgroundColor: isDark ? "#0f172a" : isDark ? "#ffffff" : "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: isDark ? "#1e293b" : isDark ? "#f1f5f9" : "#0f172a",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titulo: { fontSize: 16, fontWeight: "700", color: isDark ? "#f1f5f9" : "#0f172a" },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 16, color: "#94a3b8", fontWeight: "700" },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: isDark ? "#1e293b" : isDark ? "#f1f5f9" : "#0f172a",
    borderWidth: 1,
    borderColor: isDark ? "#334155" : "#cbd5e1",
  },
  itemRowSelected: {
    backgroundColor: "#083344",
    borderColor: "#0891b2",
  },
  iconContainer: {
    width: 32,
    alignItems: "center",
  },
  itemText: {
    fontSize: 15,
    fontWeight: "600",
    color: isDark ? "#f1f5f9" : "#0f172a",
  },
  itemTextSelected: {
    color: "#67e8f9",
    fontWeight: "700",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Modal de Nova Transação
// ─────────────────────────────────────────────────────────────────────────────

interface NovaTransacaoModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialValues?: { title: string; amount: string; category: string; isForecast?: boolean } | null;
}

function NovaTransacaoModal({
  visible,
  onClose,
  onSuccess,
  initialValues,
}: NovaTransacaoModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = getStyles(isDark);

  const { registrar, isLoading, error } = useRegistrarTransacao();

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [amount, setAmount] = useState(initialValues?.amount ?? "");
  const [type, setType] = useState<TransactionType>("expense");
  const [categoria, setCategoria] = useState<string>("Alimentação");
  const [isFixed, setIsFixed] = useState(false);
  const [diaCobranca, setDiaCobranca] = useState(new Date().getDate().toString());

  const [cameraAberta, setCameraAberta] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);

  const opcoesDisponiveis = type === "income" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  useEffect(() => {
    const existe = opcoesDisponiveis.some((o) => o.label === categoria);
    if (!existe) {
      setCategoria(opcoesDisponiveis[0].label);
    }
  }, [type, opcoesDisponiveis, categoria]);

  useEffect(() => {
    if (initialValues) {
      setTitle(initialValues.title);
      setAmount(initialValues.amount);
      if (initialValues.category) {
        setCategoria(initialValues.category);
      }
    }
  }, [initialValues]);

  const handleCaptura = useCallback((tit: string, val: string, cat: string) => {
    setTitle(tit);
    setAmount(val);
    setType("expense");
    setCategoria(cat);
    setCameraAberta(false);
  }, []);

  async function handleSubmit() {
    const parsed = parseFloat(amount.replace(",", "."));
    if (!title.trim() || isNaN(parsed) || !categoria) return;

    let transactionDate = undefined;
    let recDay = undefined;
    if (isFixed) {
      if (diaCobranca === "quinto_dia_util") {
        recDay = "quinto_dia_util";
        const agora = new Date();
        const ano = agora.getFullYear();
        const mes = agora.getMonth() + 1;
        const dia = getQuintoDiaUtil(ano, mes);
        transactionDate = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      } else {
        const d = parseInt(diaCobranca, 10);
        if (isNaN(d) || d < 1 || d > 31) {
          Alert.alert("Erro", "Dia da cobrança inválido (deve ser de 1 a 31).");
          return;
        }
        recDay = String(d);
        const agora = new Date();
        const ano = agora.getFullYear();
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const dia = String(d).padStart(2, '0');
        transactionDate = `${ano}-${mes}-${dia}`;
      }
    }

    const result = await registrar({
      title: title.trim(),
      amount: parsed,
      type,
      category: categoria,
      isFixed,
      recurrenceDay: recDay,
      isForecast: initialValues?.isForecast ?? false,
      date: transactionDate,
    });

    if (result) {
      setTitle("");
      setAmount("");
      setCategoria(type === "income" ? "Salário" : "Alimentação");
      setIsFixed(false);
      setType("expense");
      onSuccess();
      onClose();
    }
  }

  if (cameraAberta) {
    return (
      <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
        <CameraScreen
          onCapturaConcluida={handleCaptura}
          onFechar={() => setCameraAberta(false)}
        />
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Nova Transação</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          {/* Botão em Destaque: Escanear Conta */}
          <TouchableOpacity
            style={styles.cameraHighlightBtn}
            onPress={() => setCameraAberta(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={24} color="#67e8f9" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.cameraHighlightTitle}>Escanear Conta com Câmera</Text>
              <Text style={styles.cameraHighlightSub}>Auto-preencher formulário via OCR</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#0891b2" />
          </TouchableOpacity>

          <View style={styles.divisorOu}>
            <View style={styles.divisorLinha} />
            <Text style={styles.divisorTexto}>ou preencha os dados</Text>
            <View style={styles.divisorLinha} />
          </View>

          {/* Seletor Primário de Tipo */}
          <Text style={styles.inputLabel}>Tipo de Transação</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeBtn, type === "expense" && styles.typeBtnExpenseActive]}
              onPress={() => setType("expense")}
            >
              <Text style={[styles.typeBtnText, type === "expense" && { color: "#f43f5e" }]}>
                📉 Despesa
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeBtn, type === "income" && styles.typeBtnIncomeActive]}
              onPress={() => setType("income")}
            >
              <Text style={[styles.typeBtnText, type === "income" && { color: "#10b981" }]}>
                📈 Receita
              </Text>
            </TouchableOpacity>
          </View>

          {/* Título */}
          <Text style={styles.inputLabel}>Título</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Salário, Conta de Luz, Depósito..."
            placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
          />

          {/* Valor */}
          <Text style={styles.inputLabel}>Valor (R$)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
            keyboardType="decimal-pad"
          />

          {/* BOTÃO CUSTOMIZADO: Selecionar Categoria */}
          <Text style={styles.inputLabel}>
            Categoria ({type === "income" ? "Receitas" : "Despesas"})
          </Text>
          <TouchableOpacity
            style={styles.categorySelectBtn}
            onPress={() => setCatModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {renderCategoryIcon(categoria, 22)}
              <Text style={styles.categorySelectText}>{categoria}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#67e8f9" />
          </TouchableOpacity>

          {/* Switch Fixa/Recorrente */}
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Transação Recorrente / Fixa?</Text>
              <Text style={styles.switchSubLabel}>Repete todos os meses</Text>
            </View>
            <Switch
              value={isFixed}
              onValueChange={setIsFixed}
              trackColor={{ false: isDark ? "#1e293b" : isDark ? "#f1f5f9" : "#0f172a", true: "#0891b2" }}
              thumbColor={isFixed ? "#67e8f9" : isDark ? "#475569" : "#94a3b8"}
            />
          </View>

          {isFixed && (
            <>
              <Text style={styles.inputLabel}>Dia da Cobrança / Recebimento</Text>
              
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                <TouchableOpacity 
                  style={[styles.input, { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: diaCobranca === "quinto_dia_util" ? "#0891b2" : (isDark ? "#1e293b" : "#f1f5f9") }]}
                  onPress={() => setDiaCobranca("quinto_dia_util")}
                >
                  <Text style={{ color: diaCobranca === "quinto_dia_util" ? "#fff" : (isDark ? "#f1f5f9" : "#0f172a"), fontWeight: "600", fontSize: 13 }}>5º Dia Útil</Text>
                </TouchableOpacity>

                <TextInput
                  style={[styles.input, { flex: 1, textAlign: "center" }]}
                  value={diaCobranca === "quinto_dia_util" ? "" : diaCobranca}
                  onChangeText={(text) => setDiaCobranca(text.replace(/[^0-9]/g, ""))}
                  placeholder="Dia (1-31)"
                  placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </>
          )}

          {error && <Text style={styles.errorText}>⚠️ {error}</Text>}

          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitBtnText}>
              {isLoading ? "Salvando..." : "✓ Salvar Lançamento"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Customizado de Seleção de Categoria */}
      <ModalSelecaoCategoria
        visible={catModalVisible}
        type={type}
        categoriaAtual={categoria}
        onClose={() => setCatModalVisible(false)}
        onSelect={(cat) => setCategoria(cat)}
      />
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente de Item do Histórico de Transações
// ─────────────────────────────────────────────────────────────────────────────

interface TransacaoItemProps {
  transaction: Transaction;
  onDelete: (id: string) => void;
  onReconcile?: (transaction: Transaction) => void;
}

function TransacaoItem({ transaction, onDelete, onReconcile }: TransacaoItemProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = getStyles(isDark);

  const isPoupanca =
    transaction.category === "Poupança" || transaction.category === "Reserva da Moto";
  const isIncome = transaction.type === "income";

  let bgCard = isDark ? "#0f172a" : "#ffffff";
  let borderColor = isDark ? "#1e293b" : "#e2e8f0";
  let valorCor = isIncome ? "#34d399" : "#f43f5e";
  let sinal = isIncome ? "+" : "-";

  if (transaction.isForecast) {
    bgCard = isDark ? "#451a03" : "#fffbeb";
    borderColor = "#f59e0b";
    valorCor = "#f59e0b";
  } else if (isPoupanca) {
    bgCard = isDark ? "#083344" : "#cffafe"; // Cyan-950 and Cyan-100
    borderColor = "#0891b2";
    valorCor = isDark ? "#67e8f9" : "#0891b2";
  }

  return (
    <View style={[styles.txCard, { backgroundColor: bgCard, borderColor }]}>
      <View style={styles.txIconBg}>
        {renderCategoryIcon(transaction.category, 20)}
      </View>

      <View style={styles.txMainInfo}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {transaction.title}
        </Text>

        <View style={styles.txTagRow}>
          <View
            style={[
              styles.txCategoryBadge,
              isPoupanca && { backgroundColor: "#083344" },
              isIncome && { backgroundColor: "#065f46" },
            ]}
          >
            <Text
              style={[
                styles.txCategoryText,
                isPoupanca && { color: "#67e8f9" },
                isIncome && { color: "#34d399" },
              ]}
            >
              {transaction.category}
            </Text>
          </View>
          <Text style={styles.txDate}>{formatarData(transaction.date)}</Text>
        </View>
      </View>

      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: valorCor }]}>
          {sinal} {formatCurrency(transaction.amount)}
        </Text>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center", marginTop: 8 }}>
          {transaction.isForecast && onReconcile && (
            <TouchableOpacity onPress={() => onReconcile(transaction)} accessibilityLabel="Consolidar valor">
              <Ionicons name="checkmark-circle-outline" size={20} color="#f59e0b" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onDelete(transaction.id)}
            accessibilityLabel="Deletar transação"
          >
            <Ionicons name="trash-outline" size={16} color={isDark ? "#64748b" : "#94a3b8"} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tela Principal de Lançamentos
// ─────────────────────────────────────────────────────────────────────────────

function ModalReconciliacao({
  visible,
  transaction,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onConfirm: (transaction: Transaction, newAmount: number) => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [amount, setAmount] = useState("");
  // Reusing input style directly
  const inputStyle = {
    height: 56,
    backgroundColor: isDark ? "#1e293b" : "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: isDark ? "#f1f5f9" : "#0f172a",
    borderWidth: 1,
    borderColor: isDark ? "#334155" : "#cbd5e1",
  };

  useEffect(() => {
    if (transaction) {
      setAmount(String(transaction.amount));
    }
  }, [transaction]);

  if (!transaction) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: isDark ? "rgba(2, 6, 23, 0.85)" : "rgba(2, 6, 23, 0.5)", justifyContent: "center", padding: 20 }}>
        <View style={{ backgroundColor: isDark ? "#0f172a" : "#ffffff", padding: 24, borderRadius: 20, borderWidth: 1, borderColor: isDark ? "#1e293b" : "#e2e8f0" }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: isDark ? "#f1f5f9" : "#0f172a", marginBottom: 8 }}>Consolidar Valor Real</Text>
          <Text style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>Qual foi o valor real obtido para "{transaction.title}"?</Text>
          
          <TextInput
            style={inputStyle}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
          />

          <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
            <TouchableOpacity style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: isDark ? "#1e293b" : "#f1f5f9", alignItems: "center" }} onPress={onClose}>
              <Text style={{ color: isDark ? "#f1f5f9" : "#0f172a", fontWeight: "600" }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#0891b2", alignItems: "center" }} 
              onPress={() => {
                const parsed = parseFloat(amount.replace(",", "."));
                if (!isNaN(parsed) && parsed > 0) {
                  onConfirm(transaction, parsed);
                }
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Consolidar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function LancamentosScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = getStyles(isDark);

  const [modalVisible, setModalVisible] = useState(false);
  const [cameraDirect, setCameraDirect] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState<{
    title: string;
    amount: string;
    category: string;
    isForecast?: boolean;
  } | null>(null);

  const [modalReconciliarVisible, setModalReconciliarVisible] = useState(false);
  const [transacaoReconciliar, setTransacaoReconciliar] = useState<Transaction | null>(null);

  const params = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (params.openModal === "true") {
      setInitialFormValues({
        title: (params.title as string) || "Cálculo",
        amount: (params.amount as string) || "0",
        category: (params.category as string) || "Outros",
        isForecast: params.isForecast === "true",
      });
      setModalVisible(true);
      router.setParams({ openModal: "", amount: "", title: "", category: "", isForecast: "" });
    } else if (params.openScan === "true") {
      setInitialFormValues(null);
      setCameraDirect(true);
      router.setParams({ openScan: "" });
    }
  }, [params.openModal, params.openScan]);

  const { transacoes, isLoading, refetch, deletarTransacao, atualizarTransacao } = useTransacoes();

  const transacoesProjetadas = React.useMemo(() => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1; // 1-12

    return transacoes.map((t) => {
      if (t.isFixed && t.recurrenceDay) {
        let diaProjetado = 1;
        if (t.recurrenceDay === "quinto_dia_util") {
          diaProjetado = getQuintoDiaUtil(anoAtual, mesAtual);
        } else {
          const parsed = parseInt(t.recurrenceDay, 10);
          if (!isNaN(parsed)) {
            const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate();
            diaProjetado = parsed > ultimoDia ? ultimoDia : parsed;
          }
        }

        const mStr = String(mesAtual).padStart(2, "0");
        const dStr = String(diaProjetado).padStart(2, "0");

        const props = t.toProps();
        props.date = `${anoAtual}-${mStr}-${dStr}`;
        // Create a new instance that mimics the original but with projected date
        return Object.getPrototypeOf(t).constructor.reconstituir(props) as Transaction;
      }
      return t;
    });
  }, [transacoes]);

  const handleReconcile = useCallback(async (transaction: Transaction, newAmount: number) => {
    const props = transaction.toProps();
    props.amount = newAmount;
    props.isForecast = false;
    props.updatedAt = Date.now();
    // Use the class reconstitution to guarantee domain methods
    const updatedTransaction = Object.getPrototypeOf(transaction).constructor.reconstituir(props);
    await atualizarTransacao(updatedTransaction);
    setModalReconciliarVisible(false);
    setTransacaoReconciliar(null);
  }, [atualizarTransacao]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleOpenScan = () => {
    setCameraDirect(true);
  };

  const handleScanCompleted = (titulo: string, valor: string, cat: string) => {
    setCameraDirect(false);
    setInitialFormValues({ title: titulo, amount: valor, category: cat });
    setModalVisible(true);
  };

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert(
        "Excluir Lançamento",
        "Tem certeza que deseja apagar este registro?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Apagar", style: "destructive", onPress: () => deletarTransacao(id) },
        ]
      );
    },
    [deletarTransacao]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Lançamentos 💸</Text>
          <Text style={styles.headerSub}>Histórico e registro de transações</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setInitialFormValues(null);
            setModalVisible(true);
          }}
          accessibilityLabel="Registrar nova transação"
        >
          <Text style={styles.addButtonText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0891b2"
            colors={["#0891b2"]}
          />
        }
      >
        {/* Banner em Destaque: Botão "Escanear Conta" */}
        <TouchableOpacity
          style={styles.scanBannerCard}
          onPress={handleOpenScan}
          activeOpacity={0.85}
        >
          <View style={styles.scanIconBg}>
            <Ionicons name="camera" size={24} color={isDark ? "#ffffff" : "#0f172a"} />
          </View>
          <View style={styles.scanInfo}>
            <Text style={styles.scanTitle}>Escanear Conta com Câmera</Text>
            <Text style={styles.scanSub}>
              Fotografe a fatura para auto-preenchimento via OCR.
            </Text>
          </View>
          <View style={styles.scanBadge}>
            <Text style={styles.scanBadgeText}>OCR</Text>
          </View>
        </TouchableOpacity>

        {/* Lista de Histórico Real do SQLite com Ícones Vector */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Histórico de Transações 📋</Text>
          <Text style={styles.sectionSub}>{transacoesProjetadas.length} registros (Mês Atual)</Text>
        </View>

        {isLoading && transacoesProjetadas.length === 0 ? (
          <ActivityIndicator color="#0891b2" style={{ marginVertical: 40 }} />
        ) : transacoesProjetadas.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={44} color={isDark ? "#64748b" : "#94a3b8"} style={{ marginBottom: 4 }} />
            <Text style={styles.emptyTitle}>Nenhum lançamento registrado</Text>
            <Text style={styles.emptySubtitle}>
              Toque em "+ Novo" ou "Escanear Conta" para adicionar sua primeira receita ou despesa.
            </Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {transacoesProjetadas.map((item) => (
              <TransacaoItem 
                key={item.id} 
                transaction={item} 
                onDelete={handleDelete} 
                onReconcile={(t) => {
                  setTransacaoReconciliar(t);
                  setModalReconciliarVisible(true);
                }}
              />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Câmera Direta da Tela */}
      {cameraDirect && (
        <Modal visible={cameraDirect} animationType="fade" presentationStyle="fullScreen">
          <CameraScreen
            onCapturaConcluida={handleScanCompleted}
            onFechar={() => setCameraDirect(false)}
          />
        </Modal>
      )}

      {/* Modal Formulário */}
      <NovaTransacaoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          refetch();
        }}
        initialValues={initialFormValues}
      />

      {/* Modal Reconciliação */}
      <ModalReconciliacao
        visible={modalReconciliarVisible}
        transaction={transacaoReconciliar}
        onClose={() => {
          setModalReconciliarVisible(false);
          setTransacaoReconciliar(null);
        }}
        onConfirm={handleReconcile}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estilos Globais da Tela
// ─────────────────────────────────────────────────────────────────────────────

const getStyles = (isDark: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: isDark ? "#020617" : "#f8fafc" },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", padding: 20, paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: isDark ? "#f1f5f9" : "#0f172a" },
  headerSub: { fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", marginTop: 2 },
  addButton: { backgroundColor: "#0891b2", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addButtonText: { color: isDark ? "#ffffff" : "#ffffff", fontWeight: "700", fontSize: 14 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 18, gap: 14 },

  scanBannerCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: isDark ? "#083344" : "#cffafe", borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: "#0891b2",
  },
  scanIconBg: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#0891b2",
    alignItems: "center", justifyContent: "center",
  },
  scanInfo: { flex: 1 },
  scanTitle: { fontSize: 16, fontWeight: "800", color: isDark ? "#f1f5f9" : "#0f172a" },
  scanSub: { fontSize: 12, color: isDark ? "#67e8f9" : "#0891b2", marginTop: 2, lineHeight: 16 },
  scanBadge: {
    backgroundColor: "#083344", paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: "#06b6d4",
  },
  scanBadgeText: { color: "#67e8f9", fontSize: 11, fontWeight: "800" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: isDark ? "#f1f5f9" : "#0f172a" },
  sectionSub: { fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" },

  emptyCard: {
    backgroundColor: isDark ? "#0f172a" : "#ffffff", borderRadius: 16, padding: 36,
    alignItems: "center", gap: 8, borderWidth: 1, borderColor: isDark ? "#1e293b" : "#e2e8f0",
    borderStyle: "dashed", marginTop: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: isDark ? "#f1f5f9" : "#0f172a" },
  emptySubtitle: { fontSize: 13, color: isDark ? "#94a3b8" : "#64748b", textAlign: "center", lineHeight: 18 },

  txList: { gap: 10 },
  txCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, padding: 14, borderWidth: 1,
  },
  txIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center", justifyContent: "center",
  },
  txMainInfo: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: "700", color: isDark ? "#f1f5f9" : "#0f172a" },
  txTagRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  txCategoryBadge: {
    backgroundColor: isDark ? "#1e293b" : "#e2e8f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txCategoryText: { fontSize: 11, color: isDark ? "#94a3b8" : "#475569", fontWeight: "600" },
  txDate: { fontSize: 11, color: isDark ? "#94a3b8" : "#64748b" },
  txRight: { alignItems: "flex-end", gap: 4 },
  txAmount: { fontSize: 15, fontWeight: "800" },
  txDeleteBtn: { padding: 4 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: isDark ? "#0f172a" : "#ffffff" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, borderBottomColor: isDark ? "#1e293b" : "#e2e8f0", borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: isDark ? "#f1f5f9" : "#0f172a" },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? "#1e293b" : "#e2e8f0", alignItems: "center", justifyContent: "center" },
  modalCloseText: { color: isDark ? "#94a3b8" : "#475569", fontSize: 14, fontWeight: "700" },
  modalBody: { padding: 20 },

  cameraHighlightBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: isDark ? "#083344" : "#cffafe", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#0891b2", marginBottom: 20,
  },
  cameraHighlightTitle: { color: isDark ? "#ffffff" : "#0f172a", fontWeight: "700", fontSize: 15 },
  cameraHighlightSub: { color: isDark ? "#67e8f9" : "#0891b2", fontSize: 12, marginTop: 2 },

  divisorOu: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  divisorLinha: { flex: 1, height: 1, backgroundColor: isDark ? "#1e293b" : "#e2e8f0" },
  divisorTexto: { fontSize: 11, color: isDark ? "#94a3b8" : "#64748b", fontWeight: "500" },

  typeSelector: { flexDirection: "row", gap: 12, marginBottom: 16 },
  typeBtn: {
    flex: 1, backgroundColor: isDark ? "#1e293b" : "#f1f5f9", paddingVertical: 12,
    borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: "transparent",
  },
  typeBtnExpenseActive: { borderColor: "#f43f5e", backgroundColor: isDark ? "#1c0a12" : "#ffe4e6" },
  typeBtnIncomeActive: { borderColor: "#10b981", backgroundColor: isDark ? "#052e16" : "#d1fae5" },
  typeBtnText: { color: isDark ? "#94a3b8" : "#64748b", fontWeight: "600", fontSize: 14 },

  inputLabel: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: isDark ? "#1e293b" : "#f1f5f9", borderRadius: 10, padding: 14, color: isDark ? "#f1f5f9" : "#0f172a", fontSize: 15, marginBottom: 16 },

  categorySelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: isDark ? "#334155" : "#cbd5e1",
  },
  categorySelectText: { color: isDark ? "#f1f5f9" : "#0f172a", fontSize: 15, fontWeight: "600" },

  switchRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: isDark ? "#1e293b" : "#f1f5f9", padding: 14, borderRadius: 10, marginBottom: 20,
  },
  switchLabel: { color: isDark ? "#f1f5f9" : "#0f172a", fontWeight: "600", fontSize: 14 },
  switchSubLabel: { color: isDark ? "#94a3b8" : "#64748b", fontSize: 12, marginTop: 2 },

  errorText: { color: "#f43f5e", fontSize: 13, marginBottom: 12 },
  submitBtn: { backgroundColor: "#0891b2", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 32 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
});
