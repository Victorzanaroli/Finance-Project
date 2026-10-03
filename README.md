# 💰 Controle Financeiro Pessoal (Uber & Estudante)

App mobile de controle financeiro pessoal, projetado para o dia a dia acelerado de um motorista de app e estudante universitário. Construído com **Expo SDK 50+**, **React Native**, **Expo Router**, **SQLite + Drizzle ORM** (offline-first) e **NativeWind** (Tailwind Dark Mode).

---

## 🎯 Contexto e Propósito

Este não é mais um aplicativo genérico de finanças. Ele foi desenhado para resolver dores reais de quem trabalha com metas diárias flexíveis e estuda:
- **Gestão Ágil:** Lançamento expresso de corridas (Uber/99), despesas de carro (Combustível) e gastos fixos universitários (RU - Refeitório Universitário).
- **Caixinhas de Poupança:** Separação de capital automática baseada em regras percentuais (ex: guardar 20% do faturamento para manutenção/IPVA).
- **Operação Desconectada:** Criado com filosofia **Offline-First**, permitindo registrar gastos em garagens ou regiões de baixa conectividade, sincronizando em background quando houver internet.

---

## 🏗️ Arquitetura: Clean Architecture + DDD + Offline-First

O projeto adota uma segregação de camadas rigorosa, focada em longevidade e testabilidade profunda. A regra de ouro é: **O Domínio não conhece o mundo externo**.

```
src/
├── domain/                    ← Núcleo puro (Objetos TypeScript 100% testáveis e isolados)
│   ├── entities/              ← Transaction, Goal (Imutáveis e autovalidadas)
│   ├── value-objects/         ← SyncStatus, DataFinanceira, Meses (Evita bugs de fuso horário)
│   ├── services/              ← CalculadoraUber, CalculadoraRefeitorio, DistribuicaoSaldo
│   ├── gateways/              ← Interfaces (Portas) para infraestrutura externa
│   └── repositories/          ← Interfaces de banco de dados
│
├── application/               ← Casos de Uso (Orquestração do Domínio)
│   └── use-cases/             
│       ├── RegistrarTransacaoUseCase.ts
│       └── DepositarCaixinhaUseCase.ts (Com lógicas de compensação em falhas)
│
├── adapters/                  ← Cola entre a Infra/UI e a Aplicação
│   ├── repositories/          ← TransactionRepositorySQLite (Implementa repositório)
│   ├── gateways/              ← ExpoUuidGenerator, SyncGatewaySupabase
│   └── components/            ← Componentes de UI (Dumb Components)
│
├── infra/                     ← Drivers, libs de UI e Bancos de Dados
│   ├── db/                    ← Schema Drizzle e client do expo-sqlite
│   └── supabase/              ← Configurações e Client do Supabase (BaaS)
│
└── __tests__/                 ← TDD levado a sério (Níveis 1 e 2)
```

### Regras Vitais
1. **Zero Imports Externos no Domínio:** `domain/` jamais importa bibliotecas de UI, ORMs (`drizzle-orm`) ou SDKs de nuvem.
2. **Offline-First com Outbox Pattern:** Toda operação salva localmente primeiro (SQLite) assumindo o estado de `SyncStatus: 'pending'`. 
3. **Value Objects como Guardiões:** Lógicas complexas de data (que sofrem com conversões UTC em offline) foram delegadas ao VO `DataFinanceira`.

---

## 📡 Sincronização e Resolução de Conflitos

```
[Criada (Local)] → pending
       ↓ (rede disponível - Background Task)
pending → synced
       ↓ (falha de rede / erro da API)
pending → error
       ↓ (nova edição local ou retry)
error / synced → pending
```

- A fonte primária da verdade momentânea é o SQLite local do aparelho.
- A sincronização para o Postgres (Supabase) ocorre via fila (Outbox).
- Adota-se a política **Last-Write-Wins (LWW)** usando a propriedade `updatedAt`, o que garante coerência caso ocorram edições na retaguarda.

---

## 🎨 Design System Premium (FinTech Vibe)

Focado na retenção e engajamento ("Wow Factor").

- **Tema:** Dark Mode Nativo Profundo (Tailwind `slate-950`).
- **Accent Colors:** Neon Cyan (`cyan-400`) para entradas e roxo premium (`purple-600`) para poupança.
- **Tipografia:** Moderna, limpa, legível (Inter/Outfit).
- **Interatividade:** Uso de micro-interações, haptics em fluxos críticos e componentes visuais ricos construídos sobre o NativeWind.

---

## 🧪 TDD e Estratégia de Testes

Os testes não usam `mocks` da framework, mas sim **Fakes** customizados e determinísticos para uma suíte de testes ultrarrápida.

| Camada | Escopo | Ferramenta | Status |
|--------|--------|------------|--------|
| **Domínio** (Nível 1) | Entidades puras, Value Objects, Domain Services. | Jest | ✅ Cobrança rigorosa |
| **Casos de Uso** (Nível 2)| Regras orquestradas usando repositórios `Fake` em memória. | Jest | ✅ 100% Cobertura |
| **Gateways/Infra** (Nível 3) | Comunicação real com DB/Network. | Jest + SQLite | 🔜 Próximo passo |
| **Componentes UI** (Nível 4)| Teste de renderização. | RNTL | 🔜 Em implantação |

---

## 🚀 Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor de desenvolvimento (Expo)
npx expo start

# 3. Rodar os testes vitais de negócio
npm run test
```

## 🔧 Configuração Supabase

1. Crie um projeto no Supabase.
2. Crie um arquivo `.env` na raiz:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
   ```
3. Garanta que as migrations do Drizzle sejam compatíveis com as tabelas de espelho no Supabase e ative o RLS com a policy `user_id = auth.uid()`.
