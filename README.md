# My Finances - Aplicação de Gestão Financeira para Casais

> Uma PWA simples e intuitiva para rastrear gastos e conciliar despesas entre você e seu parceiro(a).

## 🚀 Quick Start

### 1. Setup Inicial

```bash
# Instalar dependências
npm install

# Gerar Prisma Client
npx prisma generate

# Criar banco de dados
npx prisma migrate dev --name init

# Rodar testes
npm run test
```

### 2. Variáveis de Ambiente

Crie `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=seu_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
DATABASE_URL=postgresql://user:password@localhost/finances
DIRECT_URL=postgresql://user:password@localhost/finances
```

### 3. Desenvolvimento

```bash
npm run dev
# Acesse http://localhost:3000
```

---

## 📁 Estrutura de Arquivos

### Specs (Documentação)

```
docs/
├── ARCHITECTURE.md           # Visão geral + Tech Stack
├── DATABASE_SPEC.md          # Schema Prisma e entidades
├── LOGIC_ACTIONS_SPEC.md     # Server Actions e validações
├── UI_UX_PWA_SPEC.md         # Design System + PWA
├── CALCULATIONS_GUIDE.md     # Guia de cálculos (Settlement)
└── UI_COMPONENTS_GUIDE.md    # Componentes React/Shadcn
```

### Backend

```
lib/
├── validations/
│   └── transaction.ts        # Schemas Zod para validação
├── calculations.ts           # Core: calculateSettlement()
└── calculations.test.ts      # 20+ testes unitários
```

### Server Actions

```
app/
└── actions/
    └── transactions.ts       # createTransaction, getTransactions, etc
```

### Componentes UI

```
app/components/
├── TransactionForm.tsx       # Formulário de nova despesa
├── DashboardCards.tsx        # SettlementCard, SpendingSummary, etc
└── TransactionsList.tsx      # Lista com filtros
```

### Páginas

```
app/(app)/
├── dashboard/
│   └── page.tsx             # Dashboard principal
└── expenses/
    └── new/
        └── page.tsx         # Página de nova despesa
```

### Banco de Dados

```
prisma/
├── schema.prisma            # Schema PostgreSQL com Prisma
└── migrations/              # Histórico de migrations
```

---

## 🧮 Lógica de Negócio

### Dois Cenários Principais

#### 1️⃣ Despesas Compartilhadas (`isShared = true`)

- Ambos usam, ambos pagam **metade**
- **Exemplo:** Aluguel R$2.000 → Cada um deve R$1.000

#### 2️⃣ "Julinho Usou Meu Cartão" (`isShared = false`)

- Uma pessoa manda a despesa, outra pagou
- **Exemplo:** Jogo R$50, você pagou → Ele/ela deve R$50 inteiro

### Cálculo de Settlement

```typescript
function calculateSettlement(transactions, currentUserId) {
    let balance = 0;

    for (const t of transactions) {
        if (t.isShared) {
            const half = t.amount / 2;
            if (t.payerId === me)
                balance += half; // Ele me deve
            else balance -= half; // Eu devo
        } else if (t.userId !== t.payerId) {
            if (t.payerId === me)
                balance += t.amount; // Ele me deve tudo
            else balance -= t.amount; // Eu devo tudo
        }
    }
    return balance;
}
```

**Resultado:**

- `balance > 0`: Parceiro deve para você
- `balance < 0`: Você deve para parceiro
- `balance = 0`: Estão quites! 🎉

---

## 🧪 Testes

O arquivo `lib/calculations.test.ts` contém **20+ testes** cobrindo:

- ✅ Despesas compartilhadas
- ✅ "Julinho usou meu cartão"
- ✅ Casos combinados realistas
- ✅ Precisão decimal (Prisma Decimal → Number)
- ✅ Edge cases

### Rodar Testes

```bash
# Todos os testes
npm run test

# Watch mode
npm run test -- --watch

# Com UI
npm run test -- --ui

# Apenas calculations
npm run test -- calculations
```

---

## 🎨 Design System

### Cores

| Uso         | Cor      | Hex     |
| ----------- | -------- | ------- |
| Primária    | Indigo   | #4f46e5 |
| Casa        | Vermelho | #ef4444 |
| Alimentação | Laranja  | #f97316 |
| Transporte  | Azul     | #3b82f6 |
| Lazer       | Roxo     | #8b5cf6 |
| Assinaturas | Cyan     | #06b6d4 |
| Éxito       | Verde    | #10b981 |

### Componentes

Todos os componentes usam:

- **UI:** Shadcn/UI
- **Estilos:** Tailwind CSS
- **Ícones:** Lucide React
- **Dark Mode:** Suportado

---

## 📦 Dependências

### Core

- `next@14+` - React framework
- `typescript` - Type safety
- `prisma` - ORM PostgreSQL
- `zod` - Validação de schemas

### UI

- `shadcn/ui` - Componentes reutilizáveis
- `tailwindcss` - Estilização
- `lucide-react` - Ícones

### Forms

- `react-hook-form` - Manejo de formulários
- `@hookform/resolvers` - Integração Zod

### Auth

- `@supabase/supabase-js` - Backend

### Testing

- `vitest` - Test runner
- `@vitest/ui` - UI de testes

---

## 🔐 Autenticação & Autorização

Todas as Server Actions:

1. Verificam `supabase.auth.getUser()`
2. Usam `userId` como contexto de autorização
3. Respeitam regras de privacidade (`isPrivate`)

### Privacy (RLS)

```sql
-- Usuário vê:
WHERE (isPrivate = false) OR (userId = auth.uid())
```

---

## 🚀 Deployment

### Vercel (Recomendado)

```bash
# 1) Linkar projeto (uma vez)
vercel link

# 2) Aplicar migrations em produção
npm run db:deploy

# 3) Seed inicial em produção (opcional e explícito)
npm run db:seed:prod
```

### Deploy Automático com GitHub Actions

O repositório inclui workflow em `.github/workflows/ci-cd-vercel.yml` com:

- `lint`, `test` e `build` em push/PR
- deploy automático para Vercel em `push` na `main`

Configure os seguintes secrets no GitHub:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY` (opcional)
- `INVITE_FROM_EMAIL` (opcional)
- `INVITE_REPLY_TO` (opcional)
- `NEXT_PUBLIC_APP_URL` (opcional)

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📋 Checklist de Desenvolvimento

- [ ] Setup inicial (`npm install`, `.env`)
- [ ] Prisma generator + migrate
- [ ] Testes passando (`npm run test`)
- [ ] Supabase Auth configurado
- [ ] Categorias criadas no banco (seed)
- [ ] Componentes Shadcn/UI instalados
- [ ] Rotas protegidas (middleware)
- [ ] Dark mode testado
- [ ] Mobile responsivo testado
- [ ] PWA manifest + service worker
- [ ] Build sem erros (`npm run build`)

---

## 🐛 Troubleshooting

### "Prisma Client not found"

```bash
npx prisma generate
```

### "Conexão ao banco falhou"

Verifique `DATABASE_URL` e `DIRECT_URL` em `.env.local`

### "Testes falhando"

```bash
npm run test -- --reporter=verbose
```

### Dark mode não funciona

Verifique `ThemeProvider` no layout root

---

## 📚 Documentação Adicional

- [Calculations Guide](docs/CALCULATIONS_GUIDE.md) - Math do settlement
- [UI Components Guide](docs/UI_COMPONENTS_GUIDE.md) - Como usar componentes
- [Architecture](docs/ARCHITECTURE.md) - Visão técnica geral
- [Database Spec](docs/DATABASE_SPEC.md) - Schema detalhado

---

## 🎯 Roadmap

### Sprint 1 - ✅ Fundação

- [x] Schema Prisma (User, Category, Transaction)
- [x] Business Logic (calculateSettlement)
- [x] Server Actions básicas
- [x] Componentes UI

### Sprint 2 - 🔄 Autenticação

- [ ] Supabase Auth (login/signup)
- [ ] Middleware de rotas protegidas
- [ ] Seed de categorias iniciais

### Sprint 3 - 📊 Dashboard Completo

- [ ] Gráfico de pizza (Recharts/Tremor)
- [ ] Filtros avançados
- [ ] Exportar relatórios

### Sprint 4 - 📱 PWA

- [ ] Manifest.json
- [ ] Service Worker
- [ ] Offline support

---

## 👥 Contribuindo

1. Fork o projeto
2. Crie uma feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

MIT - Veja LICENSE para detalhes

---

## 💡 Dicas

- Sempre validar com Zod antes de enviar ao banco
- Usar `calculateSettlement()` para exibir saldo
- Respeitar privacidade em todas as queries
- Testar dark mode frequentemente
- Mobile-first: desenvolvimento sempre no celular

---

**Feito com ❤️ para casais que querem simplicidade financeira**
