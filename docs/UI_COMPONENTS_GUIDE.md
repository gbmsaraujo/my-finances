# UI/UX - Guia de Componentes

## 🎯 Visão Geral

Todos os componentes foram criados seguindo:

- ✅ Mobile-first
- ✅ Shadcn/UI + Tailwind CSS
- ✅ Dark mode support
- ✅ Acessibilidade
- ✅ Responsivo

---

## 📱 Componentes Principais

### 1. TransactionForm

**Local:** `app/components/TransactionForm.tsx`

Formulário completo para adicionar despesas com validação Zod.

#### Uso

```tsx
import { TransactionForm } from '@/app/components/TransactionForm';

<TransactionForm
    categories={categories}
    currentUserId='user-123'
    partnerUserId='user-456'
    partnerName='Maria'
    onSuccess={() => console.log('Salvo!')}
/>;
```

#### Campos

- **Descrição** - Input de texto (3-100 chars)
- **Valor** - Número com teclado numérico automático
- **Data** - Date picker (padrão: hoje)
- **Categoria** - Select com ícones
- **Quem Pagou?** - Você ou Parceiro
- **Dividir com parceiro** - Switch (padrão: ON)
- **Despesa Privada** - Switch (desativa compartilhamento)

#### Features

- ✅ Validação em tempo real
- ✅ Mensagens de sucesso/erro
- ✅ Loading state
- ✅ Regra: privado = não-compartilhado
- ✅ Info boxes contextuais

---

### 2. SettlementCard

**Local:** `app/components/DashboardCards.tsx`

Card visual do saldo do mês em grande destaque.

#### Uso

```tsx
import { SettlementCard } from '@/app/components/DashboardCards';

<SettlementCard
    settlement={{
        balance: 150,
        description: 'Maria deve R$150 para você',
        isSettled: false,
    }}
    partnerName='Maria'
    onSettleClick={() => handleSettle()}
/>;
```

#### Estados

- **Quitado** (balance = 0): Verde + "Vocês estão quites! 🎉"
- **Você deve** (balance < 0): Laranja + TrendingDown icon
- **Maria deve** (balance > 0): Indigo + TrendingUp icon

---

### 3. SpendingSummary

**Local:** `app/components/DashboardCards.tsx`

Dois cards lado-a-lado com gastos de cada pessoa e percentual.

#### Uso

```tsx
<SpendingSummary yourSpent={2500} partnerSpent={1200} partnerName='Maria' />
```

#### Mostra

- Total de cada pessoa
- Percentual do total
- Cores diferenciadas (azul/roxo)

---

### 4. CategoryBreakdown

**Local:** `app/components/DashboardCards.tsx`

Breakdown visual com progress bars por categoria.

#### Uso

```tsx
<CategoryBreakdown
    categories={[
        { name: 'Casa', total: 2000, color: '#ef4444', icon: '🏠' },
        { name: 'Alimentação', total: 500, color: '#f97316', icon: '🍔' },
    ]}
/>
```

#### Mostra

- Nome e ícone da categoria
- Valor total
- Progress bar proporcional
- Cor customizada

---

### 5. TransactionsList

**Local:** `app/components/TransactionsList.tsx`

Lista de transações com filtros e badges informativos.

#### Uso

```tsx
<TransactionsList
    transactions={transactions}
    currentUserId='user-123'
    categories={categories}
    onCategoryChange={(catId) => console.log(catId)}
/>
```

#### Features

- ✅ Filtro por categoria
- ✅ Empty state amigável
- ✅ Badges para privado/compartilhado
- ✅ Ícones de entrada/saída
- ✅ Data formatada (pt-BR)
- ✅ Mostra quem pagou

#### Item Transaction

```
[🏠 ICON] Aluguel                2.000,00
          Casa • Dividido (50%)
          01 mar • 20:45         [Privado]
```

---

## 🎨 Paleta de Cores

```
Primária:    #4f46e5 (Indigo)
Secundária:  #8b5cf6 (Purple)
Sucesso:     #10b981 (Green)
Alerta:      #f59e0b (Amber)
Erro:        #ef4444 (Red)
Casa:        #ef4444
Alimentação: #f97316
Transporte:  #3b82f6
Lazer:       #8b5cf6
Assinaturas: #06b6d4
Saúde:       #10b981
```

---

## 📦 Dependências Necessárias

```bash
npm install \
  react-hook-form \
  @hookform/resolvers \
  zod \
  @supabase/supabase-js \
  framer-motion \
  lucide-react
```

Shadcn/UI já deve incluir:

- Form
- Input
- Select
- Button
- Switch
- Card
- Alert
- Badge
- Skeleton

---

## 🔧 Instalação dos Componentes Shadcn/UI

Se ainda não tiver os componentes, rode:

```bash
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select
npx shadcn-ui@latest add button
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add card
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add skeleton
```

---

## 🌓 Dark Mode

Todos os componentes suportam dark mode via Tailwind `dark:` prefix.

Para ativar no projeto:

```tsx
// app/layout.tsx
<html lang='pt-BR' suppressHydrationWarning>
    <body>
        <ThemeProvider attribute='class'>{children}</ThemeProvider>
    </body>
</html>
```

---

## 📱 Mobile-First Responsivo

Todos os componentes:

- ✅ Campos grandes (h-12 = 48px)
- ✅ Teclado numérico na entrada de valor
- ✅ Gaps adequados em mobile
- ✅ Buttons com hit area 44x44px (iOS guideline)
- ✅ Teste em viewport 375px

---

## 🧪 Exemplo de Integração Completa

**Página Dashboard:**

```tsx
// app/(app)/dashboard/page.tsx
export default function DashboardPage() {
    return (
        <div className='space-y-6'>
            <SettlementCard settlement={settlement} />
            <SpendingSummary yourSpent={2500} />
            <CategoryBreakdown categories={categories} />
            <TransactionsList transactions={transactions} />
        </div>
    );
}
```

**Página de Adicionar Gasto:**

```tsx
// app/(app)/expenses/new/page.tsx
export default function AddExpensePage() {
    return (
        <TransactionForm
            categories={categories}
            currentUserId={currentUserId}
            partnerUserId={partnerUserId}
            partnerName={partnerName}
            onSuccess={() => router.push('/dashboard')}
        />
    );
}
```

---

## 🚀 Próximas Etapas

1. [ ] Instalar dependências: `npm install`
2. [ ] Gerar Shadcn/UI components: `npx shadcn-ui@latest init`
3. [ ] Rodar `npm run dev` e testar http://localhost:3000
4. [ ] Conectar com Supabase Auth
5. [ ] Integrar Server Actions aos componentes
6. [ ] Seed de categorias no banco
7. [ ] Implementar PWA (manifest.json)

---

## 📝 Notas

- Todos os componentes são "Client Components" (`"use client"`)
- Validação acontece com Zod antes de enviar
- Sucesso/erro é mostrado com Alert
- Loading state desabilita o botão
- Form reseta após sucesso
- Responsive sem media queries (Tailwind)
