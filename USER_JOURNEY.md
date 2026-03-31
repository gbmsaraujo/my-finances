# User Journey - My Finances App

## 📱 Fluxo de Telas

### 1️⃣ Dashboard (Home)

```
┌─────────────────────────────┐
│  Olá! 👋        [+]         │
│  Veja como estão as contas  │
├─────────────────────────────┤
│  ┌─────────────────────────┐ │
│  │ Maria deve para você    │ │
│  │                         │ │
│  │     R$ 50.00           │ │
│  │                         │ │
│  │ Settlement de Março     │ │  ← SettlementCard
│  │                         │ │
│  │  Pagar Débito   │       │ │
│  └─────────────────────────┘ │
├─────────────────────────────┤
│ ┌──────────────┬──────────┐  │
│ │ Seus Gastos  │ Gastos   │  │  ← SpendingSummary
│ │ R$ 2.500,00  │ Maria    │  │
│ │ 67% do total │ R$ 1.2K  │  │
│ └──────────────┴──────────┘  │
├─────────────────────────────┤
│ Gastos por Categoria:        │  ← CategoryBreakdown
│ 🏠 Casa ███████████ R$ 2.0K │
│ 🍔 Alimentação ██ R$ 450    │
│ 🎬 Lazer  █ R$ 80           │
├─────────────────────────────┤
│ Histórico de Transações:     │  ← TransactionsList
│ [🏠] Aluguel              R$ 2.000,00
│      Casa • Dividido (50%)   │
│      01 mar • 20:45 [Privado]
│                              │
│ [🍔] Mercado Do Bairro    R$ 450,00
│      Alimentação • Dividido  │
│      05 mar • 18:30          │
│                              │
│ [🎬] Cinema               R$ 80,00
│      (outro usou meu cartão) │
│      08 mar • 22:15          │
├─────────────────────────────┤
│  Registrar Nova Despesa     │
└─────────────────────────────┘
```

### 2️⃣ Nova Despesa (Add Expense Page)

```
┌─────────────────────────────────────┐
│  Nova Despesa                       │
│  Registre um gasto rápido e preciso │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Descrição                       │ │
│ │ [Almoço                      ]  │ │  ← Input (3-100 chars)
│ │ Descrição deve ter 3 caracteres│ │
│ │                                 │ │
│ │ Valor                           │ │
│ │ [R$ 0.00                     ]  │ │  ← Numeric input
│ │ Use números e ponto decimal     │ │     (inputMode="decimal")
│ │                                 │ │
│ │ Data                            │ │
│ │ [01/03/2026 ▼]                │ │  ← Date picker
│ │                                 │ │
│ │ Categoria                       │ │
│ │ [Selecione ▼]                 │ │  ← Select com ícones
│ │ - 🏠 Casa                       │ │
│ │ - 🍔 Alimentação                │ │
│ │ - 🚗 Transporte                 │ │
│ │ - 🎬 Lazer                      │ │
│ │                                 │ │
│ │ Quem pagou?                     │ │
│ │ [Eu ▼]                        │ │  ← Select
│ │ - Eu                            │ │
│ │ - Maria                         │ │
│ │ Selecione quem efetivamente ... │ │
│ │                                 │ │
│ │ ┌─────────────────────────────┐ │
│ │ │ ◯ Dividir com Maria        │ │  ← Switch (default ON)
│ │ │ Cada um paga a metade (50%)│ │
│ │ └─────────────────────────────┘ │
│ │                                 │ │
│ │ ┌─────────────────────────────┐ │
│ │ │ ◯ Despesa Privada         │ │  ← Switch
│ │ │ Você e Maria podem ver    │ │
│ │ └─────────────────────────────┘ │
│ │                                 │ │
│ │ ✨ Despesa será dividida 50/50 │ │  ← Info box
│ │                                 │ │
│ │  [ Registrar Despesa ]          │ │  ← Submit button
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 💡 Dica: Use "Quem pagou?" para   │
│    registrar despesas que Maria    │
│    pagou                           │
└─────────────────────────────────────┘
```

---

## 🔄 User Flows

### Flow 1: Adicionar Despesa Compartilhada

```
Usuario inicial
    ↓
Clica no botão [+] ou "Registrar Despesa"
    ↓
Preenche:
  - Descrição: "Aluguel"
  - Valor: "2000"
  - Data: "01/03/2026"
  - Categoria: "Casa"
  - Quem pagou?: "Eu"
  - Dividir com parceiro?: ON
    ↓
Clica em "Registrar Despesa"
    ↓
Server Action: createTransaction()
  ├─ Valida com Zod ✓
  ├─ Verifica auth ✓
  ├─ Salva no banco ✓
    ↓
✅ Sucesso! "Despesa registrada com sucesso!"
    ↓
Form reseta
    ↓
HomePage atualiza (novo saldo aparece)
    ↓
Settlement recalculado:
  - "Maria deve R$ 1.000 para você"
```

### Flow 2: "Julinho Usou Meu Cartão"

```
Julinho quer registrar um jogo que Maria pagou
    ↓
Clica [+] → Preenche form no celular da Maria
    ↓
Campos:
  - Descrição: "Jogo Elden Ring"
  - Valor: "300"
  - Categoria: "Lazer"
  - Quem pagou?: "Eu (Maria)"
  - Dividir com parceiro?: OFF (força privado? Não, opcional)
    ↓
Clica "Registrar"
    ↓
Server Action calcula:
  isShared = false
  userId = "julinho"
  payerId = "maria"
    ↓
calculateSettlement() vê:
  - Maria pagou algo que pertence a Julinho
  - Julinho DEVE R$ 300 inteiro para Maria
    ↓
✅ Dashboard atualizado:
  - Settlement: "Julinho deve R$ 300 para Maria"
  - (ou aumenta a dívida se já havia)
```

### Flow 3: Despesa Privada (Surpresa)

```
Usuário quer registrar uma despesa privada
    ↓
Preenche form, mas marca ✓ "Despesa Privada"
    ↓
System força:
  isPrivate = true
  isShared = false (automático!)
    ↓
Salva no banco
    ↓
Quando parceiro lista transações:
  - Não vê essa despesa
  - Settlement não é afetado (privado)
    ↓
Server Action aplica:
  WHERE (isPrivate = false) OR (userId = auth.uid())
```

---

## 💾 Estados dos Dados

### Exemplo: Mês de Março

| Transaction      | Owner | Payer | Shared | Private | Your Balance | Maria's Balance |
| ---------------- | ----- | ----- | ------ | ------- | ------------ | --------------- |
| Aluguel 2K       | Você  | Você  | ✓      | ✗       | +1.000       | -1.000          |
| Mercado 600      | Você  | Maria | ✓      | ✗       | -300         | +300            |
| Cinema 80        | Você  | Maria | ✗      | ✗       | -80          | +80             |
| Uber 60          | Maria | Você  | ✗      | ✗       | +60          | -60             |
| Netflix 50       | Você  | Você  | ✓      | ✗       | +25          | -25             |
| **Surpresa 200** | Maria | Maria | ✗      | ✓       | 0            | 0               |
| **TOTAL**        | -     | -     | -      | -       | **+705**     | **-705**        |

**Resultado:** Maria deve R$ 705 para você! 🎉

---

## 🎨 Estados Visuais

### SettlementCard States

#### Estado: Quites ✅

```
┌──────────────────────────────┐
│ 🔀 Saldo do Mês              │  (Verde)
│                              │
│ Vocês estão quites! 🎉       │
│ R$ 0.00                      │
│                              │
│ Sem dívidas internas mês.   │
└──────────────────────────────┘
```

#### Estado: Você Deve ❌

```
┌──────────────────────────────┐
│ ↘️ Saldo do Mês              │  (Laranja)
│                              │
│ Você deve                     │
│ R$ 150.00                     │
│                              │
│ para Maria                    │
│ [ Pagar Débito ]             │
└──────────────────────────────┘
```

#### Estado: Maria Deve ✅

```
┌──────────────────────────────┐
│ ↗️ Saldo do Mês              │  (Indigo)
│                              │
│ Maria deve                    │
│ R$ 300.00                     │
│                              │
│ para você                     │
│ [ Receber ]                  │
└──────────────────────────────┘
```

---

## 📊 Settlement Algorithm Visualization

```
Transações de Março:
├── Aluguel 2K (Shared, Você pagou)
│   └─ Maria deve 1K para você
│
├── Mercado 600 (Shared, Maria pagou)
│   └─ Você deve 300 para Maria
│
├── Cinema 80 (Não-shared, Maria pagou sua despesa)
│   └─ Você deve 80 para Maria
│
├── Uber 60 (Não-shared, Você pagou despesa de Maria)
│   └─ Maria deve 60 para você
│
└── Netflix 50 (Shared, Você pagou)
    └─ Maria deve 25 para você

CÁLCULO:
  +1.000 (aluguel)
  -300 (mercado)
  -80 (cinema)
  +60 (uber)
  +25 (netflix)
  ──────────
  +705

RESULTADO: Maria deve R$ 705 para você!
```

---

## 🔐 Privacy Rules

```
Transação PRIVADA (isPrivate = true):
  ├─ Dono vê: ✓
  └─ Parceiro vê: ✗
     └─ Não afeta o settlement do parceiro

Transação PÚBLICA (isPrivate = false):
  ├─ Dono vê: ✓
  ├─ Parceiro vê: ✓
  └─ Afeta o settlement de ambos
```

---

## 📱 Mobile Experience

```
iPhone XS Max (375px width):
┌─────────────────────────────┐
│ ▲ Header (56px)             │
│ ┌─────────────────────────┐ │
│ │ Card (gap-6)            │ │  ← Full-width - padding
│ │ ┌─────────────────────┐ │ │
│ │ │ Input (h-12) ✓      │ │ │  ← 48px buttons
│ │ │ [Largo e fácil]   │ │ │
│ │ └─────────────────────┘ │ │
│ │                         │ │
│ │ ┌─────────────────────┐ │ │
│ │ │ Select (h-12)       │ │ │
│ │ │ [Seleção fácil]  ▼ │ │ │
│ │ └─────────────────────┘ │ │
│ │                         │ │
│ │ Toggle [ON/OFF] ◯      │ │
│ │                         │ │
│ │ Button (h-14) ✓         │ │
│ │ [ Registrar Despesa ]   │ │
│ └─────────────────────────┘ │
│ [Padding]                   │
└─────────────────────────────┘
  gap-4 entre cards
  p-4 lateral
  pb-24 bottom (FAB space)
```

---

## ✨ Interações

### Validação em Tempo Real (Zod)

```
Usuario digita "Al" em descrição
  ↓
Form valida: "Descrição deve ter 3+ caracteres"
  ↓
Botão permanece desabilitado
  ↓
Usuario continua digitando "Almoço"
  ↓
✓ Validação passa
  ↓
Botão habilita
```

### Loading State

```
Clica "Registrar Despesa"
  ↓
Button: "Registrando..."
  ↓
Form desabilitado
  ↓
[500ms após sucesso]
  ↓
✅ Alert verde
  ↓
[3000ms depois]
  ↓
Alert desaparece
Form reseta
Redirecionamento (opcional)
```

---

## 🚀 Deploy Ready

Todos os componentes estão prontos para:

- Production (Vercel)
- Dark mode
- Mobile offline (com PWA)
- Acessibilidade WCAG 2.1
- Performance otimizada
