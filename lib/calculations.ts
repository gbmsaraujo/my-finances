/**
 * lib/calculations.ts
 * 
 * Core business logic para cálculo de saldo entre o casal.
 * Implementa as regras:
 * 1. Despesas Compartilhadas (isShared): Divide 50/50
 * 2. "Julinho usou meu cartão": Owner != Payer, débito total
 */

import { Decimal } from "@prisma/client/runtime/library";

export interface Transaction {
    id: string;
    amount: Decimal | number;
    isShared: boolean;
    userId: string; // Owner (a quem pertence a despesa)
    payerId: string; // Payer (quem pagou)
}

/**
 * Calcula o saldo do mês entre dois usuários.
 * 
 * @param transactions - Array de transações do mês
 * @param currentUserId - ID do usuário para o qual calcular o saldo
 * @returns Número positivo: o outro deve para você | Negativo: você deve para o outro
 * 
 * Exemplos:
 * - balance = 50: O parceiro deve R$50 para você
 * - balance = -30: Você deve R$30 para o parceiro
 * - balance = 0: Estão quites
 */
export function calculateSettlement(
    transactions: Transaction[],
    currentUserId: string
): number {
    let balance = 0;

    for (const transaction of transactions) {
        const amount = normalizeDecimal(transaction.amount);

        if (transaction.isShared) {
            // Despesas compartilhadas: divide 50/50
            const half = amount / 2;

            if (transaction.payerId === currentUserId) {
                // Eu paguei algo compartilhado, meu parceiro me deve metade
                balance += half;
            } else {
                // Se o outro pagou algo compartilhado, eu devo metade
                balance -= half;
            }
        } else {
            // Despesas não-compartilhadas: débito total
            // Caso 1: "Julinho usou meu cartão" (Owner != Payer)
            if (transaction.userId !== transaction.payerId) {
                if (transaction.payerId === currentUserId && transaction.userId !== currentUserId) {
                    // Eu paguei algo que pertence ao outro, ele me deve tudo
                    balance += amount;
                } else if (transaction.userId === currentUserId && transaction.payerId !== currentUserId) {
                    // O outro pagou algo que pertence a mim, eu devo tudo
                    balance -= amount;
                }
            }
        }
    }

    return roundToTwoDec(balance);
}

/**
 * Normaliza um valor Decimal do Prisma para número JavaScript.
 */
function normalizeDecimal(value: Decimal | number): number {
    if (typeof value === "number") {
        return value;
    }
    return value.toNumber();
}

/**
 * Arredonda para 2 casas decimais (padrão financeiro).
 */
function roundToTwoDec(value: number): number {
    return Math.round(value * 100) / 100;
}

/**
 * Calcula quanto cada usuário gastou no mês (respeitando privacidade).
 */
export function calculateTotalSpentByUser(
    transactions: Transaction[],
    userId: string
): number {
    let total = 0;

    for (const transaction of transactions) {
        if (transaction.userId === userId) {
            const amount = normalizeDecimal(transaction.amount);
            total += amount;
        }
    }

    return roundToTwoDec(total);
}

/**
 * Calcula o valor livre do mês com base no salário e despesas pendentes.
 */
export function calculateFreeAmount(
    salaryAmount: number,
    pendingExpensesAmount: number
): number {
    return roundToTwoDec(salaryAmount - pendingExpensesAmount);
}

/**
 * Retorna detalhes completos do settlement para exibição.
 */
export interface SettlementDetails {
    balance: number;
    description: string;
    isSettled: boolean;
}

export function getSettlementDetails(
    balance: number,
    currentUserName: string,
    partnerName: string
): SettlementDetails {
    if (balance === 0) {
        return {
            balance: 0,
            description: "Vocês estão quites! 🎉",
            isSettled: true,
        };
    }

    if (balance > 0) {
        return {
            balance,
            description: `${partnerName} deve R$${balance.toFixed(2)} para ${currentUserName}`,
            isSettled: false,
        };
    }

    return {
        balance,
        description: `${currentUserName} deve R$${Math.abs(balance).toFixed(2)} para ${partnerName}`,
        isSettled: false,
    };
}
