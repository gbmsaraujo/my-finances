"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
    createTransactionSchema,
    filterTransactionsSchema,
    CreateTransactionInput,
    FilterTransactionsInput,
} from "@/lib/validations/transaction";
import { calculateSettlement } from "@/lib/calculations";
import { Decimal } from "@prisma/client/runtime/library";
import { requireAuthUser } from "@/lib/auth";
import { DebtType } from "@/types/transaction";
import {
    buildInstallmentSchedule,
    buildMonthlyRecurringSchedule,
} from "@/lib/installments";
import {
    parseTransactionStatus,
    TransactionPaymentStatus,
} from "@/lib/transaction-status";

/**
 * Resposta padronizada para todas as Server Actions
 */
interface ActionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

async function getCurrentMembership(userId: string) {
    return prisma.householdMember.findFirst({
        where: { userId },
        include: {
            household: {
                include: {
                    members: true
                }
            }
        }
    });
}

/**
 * Cria uma nova transação com validação de regras de negócio.
 * 
 * Regras:
 * - Se isPrivate=true, força isShared=false
 * - userId é sempre o usuário logado
 * - Valida que payerId pertence ao casal (no futuro, quando tiver relação de parceria)
 */
export async function createTransaction(
    input: CreateTransactionInput
): Promise<ActionResponse<{ id: string; installmentGroupId?: string }>> {
    try {
        // 1. Validar input
        const validatedInput = createTransactionSchema.parse(input);

        // 2. Obter usuário logado
        const auth = await requireAuthUser();
        const category = await prisma.category.findUnique({
            where: { id: validatedInput.categoryId },
            select: { householdId: true }
        });

        if (!category) {
            return {
                success: false,
                error: "Categoria inválida para este space"
            };
        }

        const membership = await prisma.householdMember.findFirst({
            where: {
                userId: auth.userId,
                householdId: category.householdId,
            },
            include: {
                household: {
                    include: {
                        members: true,
                    },
                },
            },
        });

        if (!membership) {
            return {
                success: false,
                error: "Você não participa do space desta categoria"
            };
        }

        // 3. Aplicar regra de negócio por tipo
        const isShared =
            !validatedInput.isPrivate && validatedInput.debtType === "SHARED";
        const debtType: DebtType = validatedInput.isPrivate
            ? "INDIVIDUAL"
            : validatedInput.debtType;

        // 4. Converter amount para Decimal
        const amountDecimal = new Decimal(validatedInput.amount.toString());

        const paymentKind = validatedInput.paymentKind;

        if (paymentKind === "INSTALLMENT") {
            const installmentCount = validatedInput.installmentCount ?? 0;
            const installmentGroupId = crypto.randomUUID();
            const schedule = buildInstallmentSchedule({
                totalAmount: validatedInput.amount,
                installmentCount,
                firstDueDate: validatedInput.date,
            });

            const createdTransactions = await prisma.$transaction(
                schedule.map((installment) =>
                    prisma.transaction.create({
                        data: {
                            householdId: membership.householdId,
                            description: validatedInput.description,
                            amount: new Decimal(installment.amount.toString()),
                            date: installment.dueDate,
                            categoryId: validatedInput.categoryId,
                            userId: auth.userId,
                            payerId: auth.userId,
                            isShared,
                            isPrivate: validatedInput.isPrivate,
                            paymentKind: "INSTALLMENT",
                            installmentGroupId,
                            installmentNumber: installment.installmentNumber,
                            installmentCount,
                            installmentTotalAmount: amountDecimal,
                            quoteValues: schedule.map((item) => ({
                                installmentNumber: item.installmentNumber,
                                dueDate: item.dueDate.toISOString(),
                                amount: item.amount,
                            })),
                            debtType,
                            paymentStatus: "PENDING",
                            note: validatedInput.note,
                        } as any,
                    }),
                ),
            );

            revalidatePath("/dashboard");
            revalidatePath("/expenses/new");

            return {
                success: true,
                data: {
                    id: createdTransactions[0]?.id ?? installmentGroupId,
                    installmentGroupId,
                },
            };
        }

        if (paymentKind === "FIXED") {
            const recurringMonths = 120;
            const installmentGroupId = crypto.randomUUID();
            const schedule = buildMonthlyRecurringSchedule({
                amount: validatedInput.amount,
                firstDueDate: validatedInput.date,
                months: recurringMonths,
            });

            const createdTransactions = await prisma.$transaction(
                schedule.map((item) =>
                    prisma.transaction.create({
                        data: {
                            householdId: membership.householdId,
                            description: validatedInput.description,
                            amount: new Decimal(item.amount.toString()),
                            date: item.dueDate,
                            categoryId: validatedInput.categoryId,
                            userId: auth.userId,
                            payerId: auth.userId,
                            isShared,
                            isPrivate: validatedInput.isPrivate,
                            paymentKind: "FIXED",
                            installmentGroupId,
                            installmentNumber: item.installmentNumber,
                            installmentCount: recurringMonths,
                            installmentTotalAmount: amountDecimal,
                            quoteValues: schedule.map((quote) => ({
                                installmentNumber: quote.installmentNumber,
                                dueDate: quote.dueDate.toISOString(),
                                amount: quote.amount,
                            })),
                            debtType,
                            paymentStatus: "PENDING",
                            note: validatedInput.note,
                        } as any,
                    }),
                ),
            );

            revalidatePath("/dashboard");
            revalidatePath("/expenses/new");

            return {
                success: true,
                data: {
                    id: createdTransactions[0]?.id ?? installmentGroupId,
                    installmentGroupId,
                },
            };
        }

        // 5. Criar transação no banco
        const transaction = await prisma.transaction.create({
            data: {
                householdId: membership.householdId,
                description: validatedInput.description,
                amount: amountDecimal,
                date: validatedInput.date,
                categoryId: validatedInput.categoryId,
                userId: auth.userId,
                payerId: auth.userId, // Defaults to current user; will be changed at settlement time via modal
                isShared,
                isPrivate: validatedInput.isPrivate,
                paymentKind,
                debtType,
                paymentStatus: "PENDING",
                note: validatedInput.note,
            } as any,
        });

        revalidatePath("/dashboard");
        revalidatePath("/expenses/new");

        return {
            success: true,
            data: { id: transaction.id },
        };
    } catch (error) {
        console.error("[createTransaction] Error:", error);

        if (error instanceof Error) {
            if (error.message.includes("unique")) {
                return {
                    success: false,
                    error: "Categoria inválida ou não encontrada",
                };
            }

            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: false,
            error: "Erro ao criar transação",
        };
    }
}

/**
 * Lista transações do mês com filtros e respeitando privacidade.
 * 
 * Regra de privacidade:
 * - Se isPrivate=true, só o dono pode ver
 * - Se isPrivate=false, ambos podem ver
 */
export async function getTransactions(
    filters: FilterTransactionsInput
): Promise<
    ActionResponse<
        Array<{
            id: string;
            description: string;
            amount: number;
            date: Date;
            categoryId: string;
            category: { name: string; color: string };
            userId: string;
            payerId: string;
            isShared: boolean;
            isPrivate: boolean;
            paymentKind: "SINGLE" | "FIXED" | "INSTALLMENT";
            installmentGroupId: string | null;
            installmentNumber: number | null;
            installmentCount: number | null;
            installmentTotalAmount: number | null;
            quoteValues: unknown;
            debtType: DebtType;
            paymentStatus: TransactionPaymentStatus;
            note?: string | null;
        }>
    >
> {
    try {
        // 1. Validar filtros
        const validatedFilters = filterTransactionsSchema.parse(filters);

        // 2. Obter usuário logado
        const auth = await requireAuthUser();
        const membership = await getCurrentMembership(auth.userId);

        if (!membership) {
            return {
                success: false,
                error: "Usuário sem space"
            };
        }

        // 3. Definir período do mês
        const startDate = new Date(validatedFilters.year, validatedFilters.month - 1, 1);
        const endDate = new Date(validatedFilters.year, validatedFilters.month, 1);

        // 4. Buscar transações com filtro de privacidade
        const transactions = await prisma.transaction.findMany({
            where: {
                date: {
                    gte: startDate,
                    lt: endDate,
                },
                householdId: membership.householdId,
                // Privacidade: deve ser pública OR ser do usuário logado
                OR: [
                    { isPrivate: false }, // Visível para todos
                    { userId: auth.userId }, // Ou pertence ao usuário
                ],
                // Filtro opcional por categoria
                ...(validatedFilters.categoryId && {
                    categoryId: validatedFilters.categoryId,
                }),
            },
            include: {
                category: {
                    select: {
                        name: true,
                        color: true,
                    },
                },
            },
            orderBy: {
                date: "desc",
            },
        });

        // 5. Converter Decimal para Number
        const formattedTransactions = transactions.map((t) => {
            const transactionRecord = t as typeof t & {
                paymentKind?: "SINGLE" | "FIXED" | "INSTALLMENT";
                installmentGroupId?: string | null;
                installmentNumber?: number | null;
                installmentCount?: number | null;
                installmentTotalAmount?: Decimal | number | null;
                quoteValues?: unknown;
            };
            const { status: legacyStatus, note } = parseTransactionStatus(t.note);
            const paymentStatus: TransactionPaymentStatus =
                t.paymentStatus === "PENDING" && legacyStatus === "PAID"
                    ? "PAID"
                    : t.paymentStatus;

            return {
                id: t.id,
                description: t.description,
                amount: typeof t.amount === "number" ? t.amount : t.amount.toNumber(),
                date: t.date,
                categoryId: t.categoryId,
                category: t.category,
                userId: t.userId,
                payerId: t.payerId,
                isShared: t.isShared,
                isPrivate: t.isPrivate,
                paymentKind: transactionRecord.paymentKind ?? "SINGLE",
                installmentGroupId: transactionRecord.installmentGroupId ?? null,
                installmentNumber: transactionRecord.installmentNumber ?? null,
                installmentCount: transactionRecord.installmentCount ?? null,
                installmentTotalAmount: transactionRecord.installmentTotalAmount
                    ? typeof transactionRecord.installmentTotalAmount === "number"
                        ? transactionRecord.installmentTotalAmount
                        : transactionRecord.installmentTotalAmount.toNumber()
                    : null,
                quoteValues: transactionRecord.quoteValues ?? null,
                debtType: t.debtType,
                paymentStatus,
                note,
            };
        });

        return {
            success: true,
            data: formattedTransactions,
        };
    } catch (error) {
        console.error("[getTransactions] Error:", error);

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: false,
            error: "Erro ao buscar transações",
        };
    }
}

export async function toggleTransactionPaymentStatus(
    transactionId: string,
    status: TransactionPaymentStatus,
): Promise<ActionResponse<{ id: string; paymentStatus: TransactionPaymentStatus }>> {
    try {
        const auth = await requireAuthUser();
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            select: {
                id: true,
                householdId: true,
                note: true,
            },
        });

        if (!transaction) {
            return {
                success: false,
                error: "Transação não encontrada",
            };
        }

        const membership = await prisma.householdMember.findFirst({
            where: {
                userId: auth.userId,
                householdId: transaction.householdId,
            },
            select: { householdId: true },
        });

        if (!membership) {
            return {
                success: false,
                error: "Você não tem acesso a esta transação",
            };
        }

        const { note } = parseTransactionStatus(transaction.note);
        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                paymentStatus: status,
                note,
            },
        });

        revalidatePath("/dashboard");

        return {
            success: true,
            data: {
                id: transactionId,
                paymentStatus: status,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar status",
        };
    }
}

/**
 * Atualiza o status de pagamento e/ou quem pagou a transação
 */
export async function updateTransactionStatus(
    transactionId: string,
    status: TransactionPaymentStatus,
    payerId?: string,
): Promise<ActionResponse<{ id: string; paymentStatus: TransactionPaymentStatus; payerId: string }>> {
    try {
        const auth = await requireAuthUser();
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            select: {
                id: true,
                householdId: true,
                note: true,
                payerId: true,
            },
        });

        if (!transaction) {
            return {
                success: false,
                error: "Transação não encontrada",
            };
        }

        const membership = await prisma.householdMember.findFirst({
            where: {
                userId: auth.userId,
                householdId: transaction.householdId,
            },
            select: { householdId: true },
        });

        if (!membership) {
            return {
                success: false,
                error: "Você não tem acesso a esta transação",
            };
        }

        // If payerId is provided, validate that it's a valid household member
        if (payerId) {
            const payerMembership = await prisma.householdMember.findFirst({
                where: {
                    userId: payerId,
                    householdId: transaction.householdId,
                },
            });

            if (!payerMembership) {
                return {
                    success: false,
                    error: "Pagador inválido para este espaço",
                };
            }
        }

        const { note } = parseTransactionStatus(transaction.note);
        const finalPayerId = payerId ?? transaction.payerId;

        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                paymentStatus: status,
                payerId: finalPayerId,
                note,
            },
        });

        revalidatePath("/dashboard");

        return {
            success: true,
            data: {
                id: transactionId,
                paymentStatus: status,
                payerId: finalPayerId,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar transação",
        };
    }
}

/**
 * Calcula o saldo do mês (Settlement).
 * Retorna o quanto um deve para o outro.
 */
export async function getMonthlySettlement(
    month: number,
    year: number
): Promise<
    ActionResponse<{
        balance: number;
        description: string;
        isSettled: boolean;
    }>
> {
    try {
        // 1. Obter usuário logado
        const auth = await requireAuthUser();
        const membership = await getCurrentMembership(auth.userId);

        if (!membership) {
            return {
                success: false,
                error: "Usuário sem space"
            };
        }

        // 2. Buscar transações do mês (apenas não-privadas e do usuário)
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        const transactions = await prisma.transaction.findMany({
            where: {
                date: {
                    gte: startDate,
                    lt: endDate,
                },
                householdId: membership.householdId,
                paymentStatus: "PENDING",
                OR: [{ isPrivate: false }, { userId: auth.userId }],
            },
        });

        // 3. Calcular settlement
        const balance = calculateSettlement(transactions, auth.userId);

        const isSettled = balance === 0;
        const description = isSettled
            ? "Vocês estão quites! 🎉"
            : balance > 0
                ? `Seu parceiro deve R$${balance.toFixed(2)} para você`
                : `Você deve R$${Math.abs(balance).toFixed(2)} para seu parceiro`;

        return {
            success: true,
            data: {
                balance,
                description,
                isSettled,
            },
        };
    } catch (error) {
        console.error("[getMonthlySettlement] Error:", error);

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: false,
            error: "Erro ao calcular settlement",
        };
    }
}

/**
 * Calcula o resumo do dashboard para o mês.
 * Retorna: total gasto por categoria, total por usuário.
 */
export async function getDashboardSummary(
    month: number,
    year: number
): Promise<
    ActionResponse<{
        totalSpent: number;
        totalByCategory: Array<{ name: string; total: number; color: string }>;
    }>
> {
    try {
        // 1. Obter usuário logado
        const auth = await requireAuthUser();
        const membership = await getCurrentMembership(auth.userId);

        if (!membership) {
            return {
                success: false,
                error: "Usuário sem space"
            };
        }

        // 2. Definir período
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        // 3. Buscar transações
        const transactions = await prisma.transaction.findMany({
            where: {
                date: {
                    gte: startDate,
                    lt: endDate,
                },
                householdId: membership.householdId,
                OR: [{ isPrivate: false }, { userId: auth.userId }],
            },
            include: {
                category: {
                    select: {
                        name: true,
                        color: true,
                    },
                },
            },
        });

        // 4. Calcular totais
        let totalSpent = 0;
        const categoryTotals = new Map<
            string,
            { name: string; total: number; color: string }
        >();

        for (const t of transactions) {
            const amount = typeof t.amount === "number" ? t.amount : t.amount.toNumber();
            totalSpent += amount;

            const categoryKey = t.categoryId;
            if (!categoryTotals.has(categoryKey)) {
                categoryTotals.set(categoryKey, {
                    name: t.category.name,
                    total: 0,
                    color: t.category.color,
                });
            }

            const categoryData = categoryTotals.get(categoryKey)!;
            categoryData.total += amount;
        }

        return {
            success: true,
            data: {
                totalSpent: Math.round(totalSpent * 100) / 100,
                totalByCategory: Array.from(categoryTotals.values()),
            },
        };
    } catch (error) {
        console.error("[getDashboardSummary] Error:", error);

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: false,
            error: "Erro ao buscar resumo do dashboard",
        };
    }
}
