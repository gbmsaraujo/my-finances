
---

# Spec Técnica: Financial Management App (Couple Edition)

## 1. Objetivo do Sistema
Uma aplicação progressiva (PWA) para gestão financeira de um casal, focada em simplicidade, separação de despesas privadas e conciliação de despesas compartilhadas ("Quem deve quanto para quem").

## 2. Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **Linguagem:** TypeScript
- **Banco de Dados:** PostgreSQL (via Supabase)
- **ORM:** Prisma
- **Autenticação:** Supabase Auth
- **Estilização:** Tailwind CSS + Shadcn/UI
- **Gráficos:** Recharts ou Tremor

## 3. Modelo de Dados (Entidades)

### User
- `id`: uuid (PK)
- `name`: string
- `email`: string (unique)

### Category
- `id`: uuid (PK)
- `name`: string (ex: Aluguel, Mercado, Lazer)
- `is_fixed`: boolean (se é conta fixa mensal)

### Transaction
- `id`: uuid (PK)
- `description`: string
- `amount`: decimal (precisão 2)
- `date`: timestamp
- `category_id`: uuid (FK)
- `user_id`: uuid (FK) -> Quem realizou o lançamento
- `payer_id`: uuid (FK) -> Quem efetivamente pagou (dono do cartão/conta)
- `is_shared`: boolean -> Se deve ser dividido entre o casal
- `is_private`: boolean -> Se é visível apenas para o `user_id`

---

## 4. Regras de Negócio (Core Logic)

### A. Visibilidade
1. Se `is_private == true`, a transação só deve retornar em queries onde o `auth.uid() == user_id`.
2. Se `is_private == false`, ambos os membros do casal podem ver a transação.

### B. Divisão de Despesas (The "Home" Label)
- Se uma transação for marcada como `is_shared == true`:
    - O valor de custo individual é `amount / 2`.
    - O sistema deve computar que o usuário que **não** é o `payer_id` deve metade do valor ao `payer_id`.

### C. O Cenário "Julinho usou meu cartão"
- `user_id`: Julinho
- `payer_id`: Noiva
- `is_shared`: false
- **Lógica:** Julinho deve 100% do `amount` para a Noiva. O gasto aparece no orçamento do Julinho, mas o desembolso financeiro foi da Noiva.

### D. Cálculo de Saldo (Settlement)
Ao final do mês, o sistema deve calcular:
- `Total_Shared_By_UserA`: Soma de (amount/2) de todas as transações shared onde Payer = UserA.
- `Total_Shared_By_UserB`: Soma de (amount/2) de todas as transações shared onde Payer = UserB.
- `Direct_Debts_A_to_B`: Soma de amount onde User=A, Payer=B e shared=false.
- `Final_Balance`: `Total_Shared_By_UserA - Total_Shared_By_UserB + Direct_Debts_B_to_A - Direct_Debts_A_to_B`.

---

## 5. Requisitos Funcionais (Backlog)

### Sprint 1: Fundação
- [ ] Configuração do Supabase Auth (Login/Signup).
- [ ] Setup do Prisma com as tabelas `User`, `Category` e `Transaction`.
- [ ] Middleware de proteção de rotas.

### Sprint 2: Lançamentos
- [ ] CRUD de transações com filtros (Mês/Ano).
- [ ] Lógica de "Payer" vs "User" no formulário.
- [ ] Toggle para despesa privada (is_private).

### Sprint 3: Inteligência e UI
- [ ] Dashboard com resumo: "Quanto eu gastei", "Quanto meu parceiro gastou", "Saldo entre nós".
- [ ] Gráfico de pizza por categoria.
- [ ] Configuração de PWA (manifest.json e service workers).

---

## 6. Orientações para o Copilot / IA
- Sempre utilize **Server Actions** para mutações de dados.
- Siga os princípios de **Zod** para validação de formulários.
- Para cálculos financeiros, utilize uma biblioteca como `big.js` ou manipule centavos (inteiros) para evitar erros de ponto flutuante.
- Mantenha a interface limpa e "mobile-first", focada em uso rápido no celular.
