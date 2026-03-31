Excelente. Vamos para o **Spec #2: `DATABASE_SPEC.md`**.

Este documento é o "coração" da aplicação. Como estamos usando **Supabase (PostgreSQL)** e **Prisma**, precisamos garantir que os tipos de dados sejam precisos (especialmente para dinheiro) e que as relações permitam a lógica de "quem deve para quem".

Copie o conteúdo abaixo e salve como `DATABASE_SPEC.md`:

---

# Spec Técnica: Database & Persistence (`DATABASE_SPEC.md`)

## 1. Visão Geral
Este documento define a estrutura do banco de dados PostgreSQL utilizando o **Prisma ORM**. O foco é garantir integridade referencial e precisão decimal para cálculos financeiros.

## 2. Prisma Schema (The Source of Truth)

```prisma
// Localização: /prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Necessário para Supabase
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String        @id @default(uuid())
  email         String        @unique
  name          String?
  createdAt     DateTime      @default(now())
  
  // Transações que o usuário criou/é dono
  ownedTransactions Transaction[] @relation("TransactionOwner")
  
  // Transações que o usuário efetivamente pagou (fluxo de caixa)
  paidTransactions  Transaction[] @relation("TransactionPayer")
}

model Category {
  id           String        @id @default(uuid())
  name         String        @unique
  color        String        @default("#000000") // Para gráficos
  icon         String?       // Nome do ícone (Lucide React)
  isFixed      Boolean       @default(false)
  transactions Transaction[]
}

model Transaction {
  id          String   @id @default(uuid())
  description String
  amount      Decimal  @db.Decimal(10, 2) // Precisão financeira
  date        DateTime @default(now())
  
  // Relações
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  
  // Quem registrou a despesa
  userId      String
  user        User     @relation("TransactionOwner", fields: [userId], references: [id])
  
  // Quem pagou a conta (Importante para o cenário "Julinho usou meu cartão")
  payerId     String
  payer       User     @relation("TransactionPayer", fields: [payerId], references: [id])

  // Flags de Lógica
  isShared    Boolean  @default(true)  // Se true, divide por 2
  isPrivate   Boolean  @default(false) // Se true, só o dono vê
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, date])
  @@index([isShared])
}
```

---

## 3. Definições Técnicas Importantes

### A. Precisão Decimal
* **Por que não `Float`?** Em sistemas financeiros, `Float` causa erros de arredondamento (ex: `0.1 + 0.2 = 0.30000000000000004`).
* **Decisão:** Usamos `@db.Decimal(10, 2)` para garantir que todos os cálculos no banco de dados mantenham exatamente duas casas decimais.

### B. Lógica de Relacionamento (Owner vs Payer)
* **`userId` (Owner):** É a pessoa a quem o gasto pertence. Se o Julinho comprou um jogo, o `userId` é o dele.
* **`payerId` (Payer):** É a pessoa que tirou o dinheiro do bolso/cartão. Se a noiva pagou o jogo para ele, o `payerId` é o dela.
* **Impacto no Saldo:** Se `userId != payerId`, cria-se automaticamente uma dívida interna de 100% do valor. Se `isShared` for true, a dívida é de 50%.

### C. Segurança (Row Level Security - RLS)
Como usaremos Supabase, devemos configurar políticas para que:
1.  Usuários só possam ver transações onde `isPrivate == false` **OU** `userId == auth.uid()`.
2.  Usuários só possam deletar/editar transações que eles mesmos criaram (`userId == auth.uid()`).

---

## 4. Seed Data (Categorias Iniciais)
Para facilitar o início, o banco deve ser populado com:
- `Casa` (isFixed: true)
- `Alimentação`
- `Transporte`
- `Lazer`
- `Assinaturas` (isFixed: true)

