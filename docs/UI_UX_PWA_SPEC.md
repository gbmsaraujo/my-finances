Fechamos então a nossa sequência de planejamento com o **Spec #4: `UI_UX_PWA_SPEC.md`**.

Como um sênior, eu sei que um backend perfeito não vale nada se o usuário (você e seu noivo) achar difícil de usar no dia a dia. Este documento foca em **usabilidade mobile-first** e na configuração para que o app pareça um aplicativo nativo no celular.

Copie e salve como `UI_UX_PWA_SPEC.md`:

---

# Spec Técnica: UI/UX & PWA (`UI_UX_PWA_SPEC.md`)

## 1. Visão Geral
Este documento define a interface do usuário e os requisitos de Progressive Web App (PWA). O objetivo é um app extremamente rápido, com cara de "nativo", focado em lançamentos rápidos de despesas via celular.

## 2. Design System & Style
- **Framework:** Tailwind CSS.
- **Componentes:** [Shadcn/UI](https://ui.shadcn.com/) (acessível e moderno).
- **Ícones:** Lucide React.
- **Paleta de Cores:**
    - Primária: Indigo/Violet (Moderno e financeiro).
    - Feedback: Verde (Entradas/Saldo positivo), Vermelho (Saídas), Amarelo (Atenção/Dívida interna).
- **Tema:** Suporte a Dark Mode (prioritário para uso noturno).

## 3. Fluxo de Telas (User Journey)

### A. Home / Dashboard
- **Header:** Saudação e botão de Logout.
- **Resumo de Saldo:** Card principal com "Meu gasto do mês", "Gasto dele(a)" e o veredito: "**Você deve R$ X**" ou "**Ele(a) te deve R$ X**".
- **Gráfico Rápido:** Gráfico de rosca (Donut Chart) por categorias.
- **Botão Flutuante (FAB):** Um botão "+" grande no canto inferior direito para adicionar despesa rapidamente.

### B. Formulário de Lançamento (Add Expense)
- **Campos:** Descrição, Valor (teclado numérico), Data (padrão hoje), Categoria.
- **Toggles Especiais:**
    - [Switch] "Dividir com parceiro" (Default: ON).
    - [Selector] "Quem pagou?" (Opções: Eu / Parceiro).
    - [Switch] "Despesa Privada" (Se ON, esconde do parceiro).

### C. Histórico / Filtros
- Lista cronológica invertida.
- Filtro por mês/ano e por categoria.
- Diferenciação visual para o que é "Privado" (ícone de cadeado).

## 4. Configuração PWA (Mobile Experience)

Para o Copilot gerar os arquivos de PWA, siga estas definições:
- **Manifest:** Localizado em `public/manifest.json`.
- **Display:** `standalone` (remove a barra do navegador).
- **Orientation:** `portrait` (apenas vertical).
- **Theme Color:** `#4f46e5` (Indigo).
- **Icons:** Gerar ícones 192x192 e 512x512.
- **Service Worker:** Usar a biblioteca `next-pwa` para caching offline simples (permitir abrir o app sem internet para ver os últimos gastos).

## 5. Orientações para o Copilot / v0.dev
- "Crie componentes responsivos usando Shadcn/UI."
- "O formulário de transação deve ser otimizado para mobile: campos grandes e teclados numéricos para o valor."
- "Use `framer-motion` para transições suaves entre as telas para dar sensação de app nativo."
- "Implemente um 'Empty State' amigável para quando o casal ainda não tiver gastos no mês."

