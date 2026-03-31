Vamos agora para o **Spec #3: `LOGIC_ACTIONS_SPEC.md`**.

Se o banco de dados é o "corpo", este documento é o **"cérebro"** da aplicação. Aqui definiremos como os dados entram, como são validados e, principalmente, como a matemática do rateio entre você e seu noivo funciona.

Copie e salve como `LOGIC_ACTIONS_SPEC.md`:

---

# Spec Técnica: Business Logic & Server Actions (`LOGIC_ACTIONS_SPEC.md`)

## 1. Visão Geral
Este documento define a camada de lógica de backend utilizando **Next.js Server Actions**. Todas as operações de banco de dados devem passar por estas ações para garantir que as regras de negócio (privacidade e divisão de contas) sejam respeitadas.

## 2. Padrões de Implementação
- **Validação:** Usar `zod` para validar todos os inputs antes de tocar no banco.
- **Autenticação:** Toda ação deve verificar a sessão do usuário via `supabase.auth.getUser()`.
- **Tratamento de Erros:** Retornar um objeto padronizado `{ success: boolean, data?: T, error?: string }`.

## 3. Definição das Server Actions

### A. `createTransaction(data: CreateTransactionSchema)`
A ação mais crítica. Deve lidar com a lógica de "Dono" vs "Pagador".
- **Inputs:** `description`, `amount`, `date`, `categoryId`, `payerId`, `isShared`, `isPrivate`.
- **Lógica de Negócio:**
    1. Se `isPrivate` for `true`, forçar `isShared` para `false`.
    2. O `userId` (Owner) é sempre o ID do usuário logado.
    3. O `payerId` pode ser o do usuário logado ou do parceiro (ex: "Julinho usou meu cartão").

### B. `getTransactions(filters: FilterSchema)`
- **Lógica de Filtro:**
    - `WHERE (isPrivate == false) OR (isPrivate == true AND userId == currentUserId)`.
    - Isso garante que um não veja a despesa "Surpresa de Aniversário" do outro.

### C. `getDashboardSummary(month: number, year: number)`
Retorna os números consolidados para os gráficos.
- **Data Points:**
    - Total gasto por categoria (respeitando privacidade).
    - Total gasto individual vs. parceiro.

---

## 4. O Algoritmo de Conciliação (The Settlement)

A função `calculateSettlement` é o coração do app. Ela deve rodar no servidor para definir o saldo final do mês.

**Pseudocódigo da Lógica:**
```typescript
function calculateSettlement(transactions) {
  let balance = 0; // Positivo: Noivo deve para Noiva | Negativo: Noiva deve para Noivo

  for (const t of transactions) {
    if (t.isShared) {
      const half = t.amount / 2;
      // Se eu paguei algo compartilhado, meu parceiro me deve metade
      if (t.payerId === me.id) balance += half;
      // Se meu parceiro pagou algo compartilhado, eu devo metade a ele
      else balance -= half;
    } else {
      // Caso: Julinho usou meu cartão (Shared = False, Owner = Julinho, Payer = Eu)
      if (t.userId !== t.payerId) {
        if (t.payerId === me.id) balance += t.amount; // Ele me deve o valor cheio
        else balance -= t.amount; // Eu devo o valor cheio a ele
      }
    }
  }
  return balance;
}
```

---

## 5. Esquemas de Validação (Zod)

Instruir o Copilot a criar o arquivo `lib/validations/transaction.ts`:
```typescript
import { z } from "zod";

export const transactionSchema = z.object({
  description: z.string().min(3).max(50),
  amount: z.number().positive(),
  date: z.date(),
  categoryId: z.string().uuid(),
  payerId: z.string().uuid(),
  isShared: z.boolean(),
  isPrivate: z.boolean(),
});
```
6. Orientações para o Copilot
"Sempre use a biblioteca decimal.js ou converta Decimal do Prisma para Number cuidadosamente ao realizar o calculateSettlement."

"As Server Actions devem ser marcadas com a diretiva 'use server'; no topo do arquivo."

"Certifique-se de que a isPrivate nunca vaze em queries globais."