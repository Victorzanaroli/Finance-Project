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
  { label: "Salário", iconName: "cash", iconFamily: "Ionicons", color: "#34d399" },
  { label: "Freelancer", iconName: "car", iconFamily: "Ionicons", color: "#34d399" },
  { label: "Outros", iconName: "ellipsis-horizontal", iconFamily: "Ionicons", color: "#94a3b8" },
];

const CATEGORIAS_DESPESA: CategoriaOption[] = [
  { label: "Lazer", iconName: "game-controller", iconFamily: "Ionicons", color: "#ec4899" },
  { label: "Alimentação", iconName: "fast-food", iconFamily: "Ionicons", color: "#f97316" },
  { label: "Assinaturas", iconName: "tv", iconFamily: "Ionicons", color: "#14b8a6" },
  { label: "Saúde", iconName: "medkit", iconFamily: "Ionicons", color: "#ef4444" },
  { label: "Casa", iconName: "home", iconFamily: "Ionicons", color: "#3b82f6" },
  { label: "Poupança", iconName: "wallet", iconFamily: "Ionicons", color: "#c4b5fd" },
  { label: "Reserva da Moto", iconName: "motorcycle", iconFamily: "MaterialCommunityIcons", color: "#f59e0b" },
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
        <ActivityIndicator color="#7c3aed" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={camStyles.container}>
        <Ionicons name="camera" size={48} color="#7c3aed" style={{ alignSelf: "center", marginBottom: 16 }} />
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
              <ActivityIndicator color="#a855f7" size="large" />
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

const camStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617", justifyContent: "center" },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(2, 6, 23, 0.4)", justifyContent: "space-between", padding: 24 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 40 },
  topTitle: { color: "#f1f5f9", fontSize: 16, fontWeight: "700" },
  fecharBtn: { padding: 8 },
  fecharBtnText: { color: "#94a3b8", fontSize: 14, fontWeight: "600" },
  mira: {
    alignSelf: "center",
    width: 280, height: 180,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  corner: { position: "absolute", width: 28, height: 28, borderColor: "#a855f7", borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  miraText: { color: "#ffffff", fontSize: 13, textAlign: "center", fontWeight: "600", marginTop: 80 },
  bottomBar: { alignItems: "center", paddingBottom: 32 },
  capturaBtn: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 4, borderColor: "#ffffff",
  },
  capturaBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#ffffff" },
  processandoContainer: { alignItems: "center", gap: 8, paddingBottom: 40 },
  processandoTitle: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  processandoSub: { color: "#c4b5fd", fontSize: 12 },
  permTitle: { fontSize: 20, fontWeight: "700", color: "#f1f5f9", textAlign: "center", marginBottom: 12 },
  permSubtitle: { fontSize: 14, color: "#94a3b8", textAlign: "center", marginBottom: 24, paddingHorizontal: 20, lineHeight: 20 },
  permBtn: { backgroundColor: "#7c3aed", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginBottom: 12, alignItems: "center" },
  permBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  cancelBtn: { paddingVertical: 10, alignItems: "center" },
  cancelBtnText: { color: "#64748b", fontSize: 14 },
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
                    <Ionicons name="checkmark-circle" size={22} color="#7c3aed" style={{ marginLeft: "auto" }} />
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

const catModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.75)",
    justifyContent: "flex-end",
  },
  cardModal: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titulo: { fontSize: 16, fontWeight: "700", color: "#f1f5f9" },
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
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  itemRowSelected: {
    backgroundColor: "#2e1065",
    borderColor: "#7c3aed",
  },
  iconContainer: {
    width: 32,
    alignItems: "center",
  },
  itemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f1f5f9",
  },
  itemTextSelected: {
    color: "#c4b5fd",
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
  initialValues?: { title: string; amount: string; category: string } | null;
}

function NovaTransacaoModal({
  visible,
  onClose,
  onSuccess,
  initialValues,
}: NovaTransacaoModalProps) {
  const { registrar, isLoading, error } = useRegistrarTransacao();

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [amount, setAmount] = useState(initialValues?.amount ?? "");
  const [type, setType] = useState<TransactionType>("expense");
  const [categoria, setCategoria] = useState<string>("Alimentação");
  const [isFixed, setIsFixed] = useState(false);

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

    const result = await registrar({
      title: title.trim(),
      amount: parsed,
      type,
      category: categoria,
      isFixed,
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
            <Ionicons name="camera" size={24} color="#c4b5fd" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.cameraHighlightTitle}>Escanear Conta com Câmera</Text>
              <Text style={styles.cameraHighlightSub}>Auto-preencher formulário via OCR</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#a855f7" />
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
            placeholderTextColor="#475569"
          />

          {/* Valor */}
          <Text style={styles.inputLabel}>Valor (R$)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#475569"
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
            <Ionicons name="chevron-down" size={20} color="#c4b5fd" />
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
              trackColor={{ false: "#1e293b", true: "#4c1d95" }}
              thumbColor={isFixed ? "#7c3aed" : "#475569"}
            />
          </View>

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
}

function TransacaoItem({ transaction, onDelete }: TransacaoItemProps) {
  const isPoupanca =
    transaction.category === "Poupança" || transaction.category === "Reserva da Moto";
  const isIncome = transaction.type === "income";

  let bgCard = "#0f172a";
  let borderColor = "#1e293b";
  let valorCor = isIncome ? "#34d399" : "#f43f5e";
  let sinal = isIncome ? "+" : "-";

  if (isPoupanca) {
    bgCard = "#1e1035";
    borderColor = "#7c3aed";
    valorCor = "#c4b5fd";
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
              isPoupanca && { backgroundColor: "#4c1d95" },
              isIncome && { backgroundColor: "#065f46" },
            ]}
          >
            <Text
              style={[
                styles.txCategoryText,
                isPoupanca && { color: "#c4b5fd" },
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
        <TouchableOpacity
          onPress={() => onDelete(transaction.id)}
          style={styles.txDeleteBtn}
          accessibilityLabel="Deletar transação"
        >
          <Ionicons name="trash-outline" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tela Principal de Lançamentos
// ─────────────────────────────────────────────────────────────────────────────

export default function LancamentosScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [cameraDirect, setCameraDirect] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState<{
    title: string;
    amount: string;
    category: string;
  } | null>(null);

  const params = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (params.openModal === "true") {
      setInitialFormValues({
        title: (params.title as string) || "Cálculo",
        amount: (params.amount as string) || "0",
        category: (params.category as string) || "Outros",
      });
      setModalVisible(true);
      router.setParams({ openModal: "", amount: "", title: "", category: "" });
    }
  }, [params.openModal]);

  const { transacoes, isLoading, refetch, deletarTransacao } = useTransacoes();

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
            tintColor="#7c3aed"
            colors={["#7c3aed"]}
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
            <Ionicons name="camera" size={24} color="#ffffff" />
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
          <Text style={styles.sectionSub}>{transacoes.length} registros</Text>
        </View>

        {isLoading && transacoes.length === 0 ? (
          <ActivityIndicator color="#7c3aed" style={{ marginVertical: 40 }} />
        ) : transacoes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={44} color="#64748b" style={{ marginBottom: 4 }} />
            <Text style={styles.emptyTitle}>Nenhum lançamento registrado</Text>
            <Text style={styles.emptySubtitle}>
              Toque em "+ Novo" ou "Escanear Conta" para adicionar sua primeira receita ou despesa.
            </Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {transacoes.map((item) => (
              <TransacaoItem key={item.id} transaction={item} onDelete={handleDelete} />
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
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estilos Globais da Tela
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", padding: 20, paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#f1f5f9" },
  headerSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  addButton: { backgroundColor: "#7c3aed", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 18, gap: 14 },

  scanBannerCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#1e1035", borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: "#7c3aed",
  },
  scanIconBg: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#7c3aed",
    alignItems: "center", justifyContent: "center",
  },
  scanInfo: { flex: 1 },
  scanTitle: { fontSize: 16, fontWeight: "800", color: "#f1f5f9" },
  scanSub: { fontSize: 12, color: "#c4b5fd", marginTop: 2, lineHeight: 16 },
  scanBadge: {
    backgroundColor: "#4c1d95", paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: "#a855f7",
  },
  scanBadgeText: { color: "#c4b5fd", fontSize: 11, fontWeight: "800" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#f1f5f9" },
  sectionSub: { fontSize: 12, color: "#64748b" },

  emptyCard: {
    backgroundColor: "#0f172a", borderRadius: 16, padding: 36,
    alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#1e293b",
    borderStyle: "dashed", marginTop: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#f1f5f9" },
  emptySubtitle: { fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 18 },

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
  txTitle: { fontSize: 14, fontWeight: "700", color: "#f1f5f9" },
  txTagRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  txCategoryBadge: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txCategoryText: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  txDate: { fontSize: 11, color: "#64748b" },
  txRight: { alignItems: "flex-end", gap: 4 },
  txAmount: { fontSize: 15, fontWeight: "800" },
  txDeleteBtn: { padding: 4 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: "#0f172a" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, borderBottomColor: "#1e293b", borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#f1f5f9" },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" },
  modalCloseText: { color: "#94a3b8", fontSize: 14, fontWeight: "700" },
  modalBody: { padding: 20 },

  cameraHighlightBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#2e1065", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#7c3aed", marginBottom: 20,
  },
  cameraHighlightTitle: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  cameraHighlightSub: { color: "#c4b5fd", fontSize: 12, marginTop: 2 },

  divisorOu: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  divisorLinha: { flex: 1, height: 1, backgroundColor: "#1e293b" },
  divisorTexto: { fontSize: 11, color: "#475569", fontWeight: "500" },

  typeSelector: { flexDirection: "row", gap: 12, marginBottom: 16 },
  typeBtn: {
    flex: 1, backgroundColor: "#1e293b", paddingVertical: 12,
    borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: "transparent",
  },
  typeBtnExpenseActive: { borderColor: "#f43f5e", backgroundColor: "#1c0a12" },
  typeBtnIncomeActive: { borderColor: "#10b981", backgroundColor: "#052e16" },
  typeBtnText: { color: "#94a3b8", fontWeight: "600", fontSize: 14 },

  inputLabel: { color: "#94a3b8", fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: "#1e293b", borderRadius: 10, padding: 14, color: "#f1f5f9", fontSize: 15, marginBottom: 16 },

  categorySelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  categorySelectText: { color: "#f1f5f9", fontSize: 15, fontWeight: "600" },

  switchRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#1e293b", padding: 14, borderRadius: 10, marginBottom: 20,
  },
  switchLabel: { color: "#f1f5f9", fontWeight: "600", fontSize: 14 },
  switchSubLabel: { color: "#64748b", fontSize: 12, marginTop: 2 },

  errorText: { color: "#f43f5e", fontSize: 13, marginBottom: 12 },
  submitBtn: { backgroundColor: "#7c3aed", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 32 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
});
