# Setup Completo - My Finances

## ⚡ Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase (para banco/auth)
- PostgreSQL (local ou via Supabase)

---

## 🔧 Passo a Passo

### 1. Clonar/Criar Projeto

```bash
# Se começando do zero:
npx create-next-app@latest my-finances --typescript --tailwind
cd my-finances

# Se já tem a estrutura:
cd my-finances
```

### 2. Instalar Dependências

```bash
npm install \
  @supabase/supabase-js \
  @prisma/client \
  zod \
  react-hook-form \
  @hookform/resolvers \
  lucide-react \
  vitest \
  @vitest/ui
```

### 3. Instalar Shadcn/UI Components

```bash
npx shadcn-ui@latest init

# Instalar componentes necessários
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

### 4. Setup Prisma

```bash
# Instalar Prisma CLI
npm install -D prisma

# Copiar schema.prisma para prisma/
# (já está em prisma/schema.prisma)

# Gerar Prisma Client
npx prisma generate

# Criar banco e rodar migration
npx prisma migrate dev --name init
```

### 5. Configurar Supabase

Crie arquivo `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima

# Database (do Supabase ou local)
DATABASE_URL="postgresql://user:password@localhost:5432/finances?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/finances?schema=public"
```

### 6. Seed de Dados (Categorias)

Crie `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const categories = [
        { name: 'Casa', color: '#ef4444', icon: '🏠', isFixed: true },
        { name: 'Alimentação', color: '#f97316', icon: '🍔', isFixed: false },
        { name: 'Transporte', color: '#3b82f6', icon: '🚗', isFixed: false },
        { name: 'Lazer', color: '#8b5cf6', icon: '🎬', isFixed: false },
        { name: 'Assinaturas', color: '#06b6d4', icon: '🎯', isFixed: true },
        { name: 'Saúde', color: '#10b981', icon: '⚕️', isFixed: false },
    ];

    for (const cat of categories) {
        await prisma.category.upsert({
            where: { name: cat.name },
            update: {},
            create: cat,
        });
    }

    console.log('✅ Categorias criadas!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
```

Adicione a `package.json`:

```json
{
    "prisma": {
        "seed": "ts-node --compiler-options {\"module\":\"commonjs\"} prisma/seed.ts"
    }
}
```

Rode o seed:

```bash
npx prisma db seed
```

### 7. Estrutura de Pastas

```
my-finances/
├── app/
│   ├── (app)/                    # Rotas protegidas
│   │   ├── dashboard/page.tsx
│   │   └── expenses/new/page.tsx
│   ├── actions/
│   │   └── transactions.ts       # Server Actions
│   ├── components/
│   │   ├── TransactionForm.tsx
│   │   ├── DashboardCards.tsx
│   │   └── TransactionsList.tsx
│   ├── layout.tsx
│   └── page.tsx                  # Home
├── components/                   # Shadcn/UI (auto-generated)
│   └── ui/
├── lib/
│   ├── validations/
│   │   └── transaction.ts
│   ├── calculations.ts
│   ├── calculations.test.ts
│   └── prisma.ts                 # Export da instância
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SPEC.md
│   ├── LOGIC_ACTIONS_SPEC.md
│   ├── UI_UX_PWA_SPEC.md
│   ├── CALCULATIONS_GUIDE.md
│   └── UI_COMPONENTS_GUIDE.md
├── public/
│   ├── manifest.json             # PWA (criar depois)
│   └── icons/                    # PWA icons
├── .env.local                    # Variáveis de ambiente
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

### 8. Criar Prisma Client Export

Crie `lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: ['query'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 9. Middleware de Autenticação (Opcional)

Crie `middleware.ts` na raiz:

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    const {
        data: { session },
    } = await supabase.auth.getSession();

    // Redirecionar se não autenticado
    if (!session && req.nextUrl.pathname.startsWith('/app')) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    return res;
}

export const config = {
    matcher: ['/app/:path*'],
};
```

### 10. Scripts de Desenvolvimento

Atualize `package.json`:

```json
{
    "scripts": {
        "dev": "next dev",
        "build": "next build",
        "start": "next start",
        "lint": "next lint",
        "test": "vitest",
        "test:ui": "vitest --ui",
        "test:watch": "vitest --watch",
        "db:push": "prisma db push",
        "db:seed": "prisma db seed",
        "db:studio": "prisma studio",
        "db:reset": "prisma migrate reset"
    }
}
```

---

## ✅ Checklist Final

- [ ] Node 18+ instalado
- [ ] Dependências: `npm install`
- [ ] Shadcn/UI: `npx shadcn-ui@latest init` + componentes
- [ ] Prisma: `npm install -D prisma`
- [ ] `.env.local` criado com credenciais Supabase
- [ ] `npx prisma generate`
- [ ] Banco criado: `npx prisma migrate dev --name init`
- [ ] Seed rodado: `npx prisma db seed`
- [ ] Testes passando: `npm run test`
- [ ] Dev server: `npm run dev` → http://localhost:3000
- [ ] Dark mode funcionando
- [ ] Mobile responsivo (devtools)
- [ ] Form validando (Zod)
- [ ] Server Actions funcionando

---

## 🚀 Começar Desenvolvimento

1. `npm run dev`
2. Acesse http://localhost:3000
3. Teste o formulário em http://localhost:3000/expenses/new
4. Veja o dashboard em http://localhost:3000/dashboard

---

## 📝 Arquivos a Criar Manualmente

Se você ainda não copiou, crie os seguintes arquivos:

### Backend

- `lib/validations/transaction.ts`
- `lib/calculations.ts`
- `lib/calculations.test.ts`
- `app/actions/transactions.ts`

### UI

- `app/components/TransactionForm.tsx`
- `app/components/DashboardCards.tsx`
- `app/components/TransactionsList.tsx`

### Páginas

- `app/(app)/dashboard/page.tsx`
- `app/(app)/expenses/new/page.tsx`

### Config

- `prisma/schema.prisma`
- `.env.local`

---

## 🔗 Integração Supabase Auth (Próximo Passo)

Quando pronto para autenticação:

```bash
npm install @supabase/auth-helpers-nextjs @supabase/auth-helpers-react
```

Implementar:

- Login page
- Signup page
- Middleware de rotas protegidas
- Logout button

---

## 🐛 Erros Comuns

| Erro                          | Solução                                |
| ----------------------------- | -------------------------------------- |
| "Prisma Client not found"     | `npx prisma generate`                  |
| "DATABASE_URL not set"        | Verificar `.env.local`                 |
| "Tailwind não funciona"       | `npm install -D tailwindcss`           |
| "Shadcn/UI component missing" | `npx shadcn-ui@latest add [component]` |
| "Testes falhando"             | `npm run test -- --reporter=verbose`   |

---

## 📞 Suporte

- [Prisma Docs](https://www.prisma.io/docs/)
- [Shadcn/UI Docs](https://ui.shadcn.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

---

**Pronto! Agora você tem tudo para começar a desenvolver 🚀**
