"use server";

import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import { requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    MonthlyIncomeInput,
    MonthlyIncomeOverrideInput,
    monthlyIncomeOverrideSchema,
    monthlyIncomeSchema,
} from "@/lib/validations/income";
import { calculateFreeAmount } from "@/lib/calculations";

type PrismaWithIncomeDelegates = typeof prisma & {
    monthlyIncomeProfile: typeof prisma.monthlyIncomeProfile;
    monthlyIncomeEntry: typeof prisma.monthlyIncomeEntry;
};

const incomePrisma = prisma as PrismaWithIncomeDelegates;

interface ActionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

async function ensureMembership(householdId: string, userId: string) {
    return prisma.householdMember.findFirst({
        where: {
            householdId,
            userId,
        },
        select: {
            householdId: true,
        },
    });
}

export async function setDefaultMonthlyIncome(
    input: MonthlyIncomeInput
): Promise<ActionResponse<{ amount: number }>> {
    try {
        const validatedInput = monthlyIncomeSchema.parse(input);
        const auth = await requireAuthUser();

        const membership = await ensureMembership(
            validatedInput.householdId,
            auth.userId
        );

        if (!membership) {
            return {
                success: false,
                error: "Você não participa deste space",
            };
        }

        const amount = new Decimal(validatedInput.amount.toString());

        const profile = await incomePrisma.monthlyIncomeProfile.upsert({
            where: {
                householdId_userId: {
                    householdId: validatedInput.householdId,
                    userId: auth.userId,
                },
            },
            update: {
                defaultAmount: amount,
                isActive: true,
            },
            create: {
                householdId: validatedInput.householdId,
                userId: auth.userId,
                defaultAmount: amount,
                isActive: true,
            },
        });

        revalidatePath("/dashboard");

        return {
            success: true,
            data: {
                amount: profile.defaultAmount.toNumber(),
            },
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Erro ao salvar salário recorrente",
        };
    }
}

export async function setMonthlyIncomeForPeriod(
    input: MonthlyIncomeOverrideInput
): Promise<ActionResponse<{ amount: number; month: number; year: number }>> {
    try {
        const validatedInput = monthlyIncomeOverrideSchema.parse(input);
        const auth = await requireAuthUser();

        const membership = await ensureMembership(
            validatedInput.householdId,
            auth.userId
        );

        if (!membership) {
            return {
                success: false,
                error: "Você não participa deste space",
            };
        }

        const amount = new Decimal(validatedInput.amount.toString());

        const entry = await incomePrisma.monthlyIncomeEntry.upsert({
            where: {
                householdId_userId_month_year: {
                    householdId: validatedInput.householdId,
                    userId: auth.userId,
                    month: validatedInput.month,
                    year: validatedInput.year,
                },
            },
            update: {
                amount,
            },
            create: {
                householdId: validatedInput.householdId,
                userId: auth.userId,
                month: validatedInput.month,
                year: validatedInput.year,
                amount,
            },
        });

        revalidatePath("/dashboard");

        return {
            success: true,
            data: {
                amount: entry.amount.toNumber(),
                month: entry.month,
                year: entry.year,
            },
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Erro ao salvar salário do mês",
        };
    }
}

export async function addMonthlyExtraIncome(
    input: MonthlyIncomeOverrideInput
): Promise<ActionResponse<{ amount: number; month: number; year: number }>> {
    try {
        const validatedInput = monthlyIncomeOverrideSchema.parse(input);
        const auth = await requireAuthUser();

        const membership = await ensureMembership(
            validatedInput.householdId,
            auth.userId
        );

        if (!membership) {
            return {
                success: false,
                error: "Você não participa deste space",
            };
        }

        const [overrideEntry, profile] = await Promise.all([
            incomePrisma.monthlyIncomeEntry.findUnique({
                where: {
                    householdId_userId_month_year: {
                        householdId: validatedInput.householdId,
                        userId: auth.userId,
                        month: validatedInput.month,
                        year: validatedInput.year,
                    },
                },
            }),
            incomePrisma.monthlyIncomeProfile.findUnique({
                where: {
                    householdId_userId: {
                        householdId: validatedInput.householdId,
                        userId: auth.userId,
                    },
                },
            }),
        ]);

        const currentAmount = overrideEntry
            ? overrideEntry.amount.toNumber()
            : profile?.isActive
                ? profile.defaultAmount.toNumber()
                : 0;

        const nextAmount = currentAmount + validatedInput.amount;
        const amount = new Decimal(nextAmount.toString());

        const entry = await incomePrisma.monthlyIncomeEntry.upsert({
            where: {
                householdId_userId_month_year: {
                    householdId: validatedInput.householdId,
                    userId: auth.userId,
                    month: validatedInput.month,
                    year: validatedInput.year,
                },
            },
            update: {
                amount,
            },
            create: {
                householdId: validatedInput.householdId,
                userId: auth.userId,
                month: validatedInput.month,
                year: validatedInput.year,
                amount,
            },
        });

        revalidatePath("/dashboard");

        return {
            success: true,
            data: {
                amount: entry.amount.toNumber(),
                month: entry.month,
                year: entry.year,
            },
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Erro ao adicionar entrada extra",
        };
    }
}

export async function getMonthlyIncomeSummary(params: {
    householdId: string;
    month: number;
    year: number;
    pendingExpensesTotal: number;
}): Promise<
    ActionResponse<{
        salaryMonth: number;
        pendingExpensesTotal: number;
        freeAmount: number;
        hasConfiguredSalary: boolean;
    }>
> {
    try {
        const auth = await requireAuthUser();

        const membership = await ensureMembership(params.householdId, auth.userId);

        if (!membership) {
            return {
                success: false,
                error: "Você não participa deste space",
            };
        }

        const [overrideEntry, profile] = await Promise.all([
            incomePrisma.monthlyIncomeEntry.findUnique({
                where: {
                    householdId_userId_month_year: {
                        householdId: params.householdId,
                        userId: auth.userId,
                        month: params.month,
                        year: params.year,
                    },
                },
            }),
            incomePrisma.monthlyIncomeProfile.findUnique({
                where: {
                    householdId_userId: {
                        householdId: params.householdId,
                        userId: auth.userId,
                    },
                },
            }),
        ]);

        const salaryMonth = overrideEntry
            ? overrideEntry.amount.toNumber()
            : profile?.isActive
                ? profile.defaultAmount.toNumber()
                : 0;

        const freeAmount = calculateFreeAmount(
            salaryMonth,
            params.pendingExpensesTotal
        );

        return {
            success: true,
            data: {
                salaryMonth,
                pendingExpensesTotal: params.pendingExpensesTotal,
                freeAmount,
                hasConfiguredSalary: Boolean(overrideEntry || profile?.isActive),
            },
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Erro ao buscar resumo mensal",
        };
    }
}
