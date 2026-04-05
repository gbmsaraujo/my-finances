"use server";

import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth";
import { createValidationCode } from "@/lib/validation-codes";
import { sendVerificationEmail } from "@/lib/verification-email";

interface ActionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

const DEFAULT_HOUSEHOLD_NAME = "Despesas de casa";

async function ensureDefaultCategories(householdId: string) {
    const categories = [
        { name: "Casa", color: "#ef4444", icon: "house", isFixed: true },
        { name: "Comida", color: "#f97316", icon: "utensils", isFixed: false },
        { name: "Transporte", color: "#3b82f6", icon: "car", isFixed: false },
        { name: "Lazer", color: "#8b5cf6", icon: "gamepad-2", isFixed: false },
        { name: "Assinaturas", color: "#06b6d4", icon: "bookmark", isFixed: true },
        { name: "Outros", color: "#6b7280", icon: "circle", isFixed: false },
    ];

    await Promise.all(
        categories.map((category) =>
            prisma.category.upsert({
                where: {
                    householdId_name: {
                        householdId,
                        name: category.name
                    }
                },
                update: {
                    color: category.color,
                    icon: category.icon,
                    isFixed: category.isFixed
                },
                create: {
                    ...category,
                    householdId
                }
            }),
        ),
    );
}

export async function ensureUserHousehold(userId?: string): Promise<ActionResponse<{ householdId: string }>> {
    try {
        const resolvedUserId = userId ?? (await requireAuthUser()).userId;

        const existing = await prisma.householdMember.findFirst({
            where: { userId: resolvedUserId },
            include: { household: true }
        });

        if (existing?.householdId) {
            await ensureDefaultCategories(existing.householdId);
            return {
                success: true,
                data: { householdId: existing.householdId }
            };
        }

        const household = await prisma.household.create({
            data: {
                name: DEFAULT_HOUSEHOLD_NAME,
                createdById: resolvedUserId,
                members: {
                    create: {
                        userId: resolvedUserId,
                        role: "OWNER"
                    }
                }
            }
        });

        await ensureDefaultCategories(household.id);

        return {
            success: true,
            data: { householdId: household.id }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar space"
        };
    }
}

export async function createInviteCode(
    invitedEmail: string,
    householdId: string
): Promise<
    ActionResponse<{
        code: string;
        expiresAt: string;
    }>
> {
    try {
        const normalizedEmail = invitedEmail.trim().toLowerCase();
        if (!normalizedEmail) {
            return { success: false, error: "Informe um email para enviar o convite" };
        }

        const user = await requireAuthUser();

        const membership = await prisma.householdMember.findFirst({
            where: {
                userId: user.userId,
                householdId
            },
            include: {
                household: true
            }
        });

        if (!membership) {
            return { success: false, error: "Você precisa criar seu space primeiro" };
        }

        const invite = await createValidationCode({
            type: "INVITE",
            email: normalizedEmail,
            householdId: membership.householdId,
        });

        const emailResult = await sendVerificationEmail({
            type: "invite",
            to: normalizedEmail,
            code: invite.code,
            householdName: membership.household.name,
            expiresAtIso: invite.expiresAt.toISOString(),
        });

        if (!emailResult.sent) {
            await prisma.validationCode.delete({
                where: { id: invite.id },
            });

            if (emailResult.reason === "missing_env") {
                return {
                    success: false,
                    error:
                        emailResult.message ||
                        "Configuração de email ausente. Defina RESEND_API_KEY e INVITE_FROM_EMAIL.",
                };
            }

            return {
                success: false,
                error:
                    emailResult.message ||
                    "Falha ao enviar convite por email. Tente novamente em instantes.",
            };
        }

        return {
            success: true,
            data: {
                code: invite.code,
                expiresAt: invite.expiresAt.toISOString(),
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar convite"
        };
    }
}
