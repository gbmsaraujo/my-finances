# Guia: Cálculos de Settlement & Testes

## 📋 O Problema que Resolvemos

A aplicação precisa responder: **"Quem deve quanto para quem?"**

### Dois Cenários Principais

#### 1. Despesas Compartilhadas (`isShared = true`)

- Ambos usam, ambos pagam metade
- Se o aluguel é R$2.000 e você pagou, seu parceiro deve R$1.000

```
Exemplo: Aluguel R$2.000, você pagou
Balance = +1.000 (ele deve para você)
```

#### 2. "Julinho Usou Meu Cartão" (`isShared = false, userId ≠ payerId`)

- Despesa é de uma pessoa, mas outra pagou
- A pessoa deve 100% do valor

```
Exemplo: Seu parceiro comprou um jogo (R$50) mas você pagou
Balance = -50 (você deve)
```

---

## 🧪 Testes Unitários

### Configurar

Certifique-se de ter Vitest instalado:

```bash
npm install -D vitest @vitest/ui
```

### Rodar Testes

```bash
# Rodar todos os testes
npm run test

# Ou se estiver usando Vitest diretamente
npx vitest

# Com UI interativa
npx vitest --ui

# Apenas o arquivo de cálculos
npx vitest lib/calculations.test.ts

# Watch mode
npx vitest --watch
```

### Cobertura de Testes

O arquivo `lib/calculations.test.ts` contém **20+ testes** cobrindo:

✅ **Despesas Compartilhadas**

- USER_A paga compartilhado
- USER_B paga compartilhado
- Múltiplas despesas

✅ **"Julinho Usou Meu Cartão"**

- Outro paga sua despesa
- Você paga despesa do outro

✅ **Casos Combinados**

- Mix de compartilhado + débito direto
- Mês típico com 4 transações

✅ **Precisão Decimal**

- Valores com Decimal do Prisma
- Arredondamento para 2 casas

✅ **Edge Cases**

- Sem transações
- Despesa de quem pagou (sem débito)
- Transações que não afetam o usuário

---

## 💡 Entendendo o Algoritmo

### `calculateSettlement(transactions, currentUserId)`

```typescript
balance = 0

Para cada transação:
  if (shared) {
    half = amount / 2
    if (eu paguei) → balance += half  // Ele me deve
    if (outro pagou) → balance -= half // Eu devo
  } else {
    if (owner ≠ payer) {
      if (eu paguei) → balance += amount     // Ele me deve tudo
      if (outro pagou) → balance -= amount   // Eu devo tudo
    }
  }

return balance
```

### Interpretação do Resultado

- **balance > 0**: Seu parceiro deve X para você
- **balance < 0**: Você deve X para seu parceiro
- **balance = 0**: Estão quites! 🎉

---

## 🔧 Integrando nos Server Actions

Os Server Actions em `app/actions/transactions.ts` usam `calculateSettlement`:

```typescript
// Criar transação
await createTransaction({
    description: 'Aluguel',
    amount: 2000,
    date: new Date(),
    categoryId: 'cat-123',
    payerId: 'user-a', // Quem pagou
    isShared: true,
    isPrivate: false, // Ambos veem
});

// Calcular saldo do mês
const result = await getMonthlySettlement(3, 2026);
// { balance: 50, description: "Seu parceiro deve R$50..." }
```

---

## 📊 Exemplo Passo-a-Passo

Imagine o mês de Março com vocês dois:

| Transação | Descrição | Valor | Shared | Quem Pagou | Seu Balance |
| --------- | --------- | ----- | ------ | ---------- | ----------- |
| 1         | Aluguel   | 2.000 | Sim    | Você       | +1.000      |
| 2         | Mercado   | 600   | Sim    | Parceiro   | -300        |
| 3         | Cinema    | 80    | Não    | Parceiro   | -80         |
| 4         | Uber      | 60    | Não    | Você       | +60         |

**Cálculo:**

- Aluguel compartilhado que você pagou: +1.000
- Mercado compartilhado que outro pagou: -300
- Cinema (outro pagou sua despesa): -80
- Uber (você pagou despesa do outro): +60
- **Total: +1.000 - 300 - 80 + 60 = +680**

→ **Seu parceiro deve R$680 para você**

---

## 🚨 Validações Importantes

Em `lib/validations/transaction.ts`:

```typescript
{
  description: string (3-100 chars)
  amount: number (> 0)
  date: Date
  categoryId: UUID válido
  payerId: UUID válido
  isShared: boolean (default: true)
  isPrivate: boolean (default: false)
}
```

**Regra:** Se `isPrivate = true`, então `isShared` é forçado para `false`

---

## 🔐 Privacidade (RLS)

As Server Actions respeitam:

```sql
-- Usuário vê:
WHERE (isPrivate = false) OR (userId = auth.uid())
```

Então:

- Se público (`isPrivate = false`): ambos veem
- Se privado (`isPrivate = true`): só o dono vê

---

## ✨ Checklist de Setup

- [ ] `npm install vitest` (se não tiver)
- [ ] `npm run test` para rodar testes
- [ ] Criar `.env.local` com `DATABASE_URL` e `DIRECT_URL`
- [ ] `npx prisma migrate dev` (após criar database)
- [ ] Validar que testes passam 100%
- [ ] Usar `createTransaction` em formulários
- [ ] Usar `getMonthlySettlement` no dashboard
