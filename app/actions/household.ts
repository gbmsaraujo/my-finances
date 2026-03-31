"use server";

import { prisma } from "@/lib/prisma";
import { generateInviteCode, normalizeInviteCode } from "@/lib/utils";
import { requireAuthUser } from "@/lib/auth";

interface ActionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

async function sendInviteEmail(params: {
    to: string;
    code: string;
    householdName: string;
    expiresAtIso: string;
}) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.INVITE_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
        return { sent: false as const, reason: "missing_env" as const };
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: fromEmail,
            to: [params.to],
            subject: `Convite para o space ${params.householdName}`,
            html: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
              <h2>Você foi convidado para o My Finances</h2>
              <p>Use o código abaixo para entrar no space <strong>${params.householdName}</strong>:</p>
              <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">${params.code}</p>
              <p>Validade até: ${new Date(params.expiresAtIso).toLocaleString("pt-BR")}</p>
            </div>`
        })
    });

    if (!response.ok) {
        return { sent: false as const, reason: "provider_error" as const };
    }

    return { sent: true as const };
}

const DEFAULT_HOUSEHOLD_NAME = "Despesas de casa";

async function ensureDefaultCategories(householdId: string) {
    const categories = [
        { name: "Casa", color: "#ef4444", icon: "house", isFixed: true },
        { name: "Comida", color: "#f97316", icon: "utensils", isFixed: false },
        { name: "Transporte", color: "#3b82f6", icon: "car", isFixed: false },
        { name: "Lazer", color: "#8b5cf6", icon: "gamepad-2", isFixed: false },
        { name: "Assinaturas", color: "#06b6d4", icon: "bookmark", isFixed: true }
    ];

    for (const category of categories) {
        await prisma.category.upsert({
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
        });
    }
}

export async function ensureUserHousehold(): Promise<ActionResponse<{ householdId: string }>> {
    try {
        const user = await requireAuthUser();

        const existing = await prisma.householdMember.findFirst({
            where: { userId: user.userId },
            include: { household: true }
        });

        if (existing?.householdId) {
            return {
                success: true,
                data: { householdId: existing.householdId }
            };
        }

        const household = await prisma.household.create({
            data: {
                name: DEFAULT_HOUSEHOLD_NAME,
                createdById: user.userId,
                members: {
                    create: {
                        userId: user.userId,
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

export async function createInviteCode(invitedEmail?: string): Promise<ActionResponse<{ code: string; expiresAt: string; emailed: boolean }>> {
    try {
        const user = await requireAuthUser();

        const membership = await prisma.householdMember.findFirst({
            where: { userId: user.userId },
            include: {
                household: true
            }
        });

        if (!membership) {
            return { success: false, error: "Você precisa criar seu space primeiro" };
        }

        const code = generateInviteCode();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

        await prisma.householdInvite.create({
            data: {
                householdId: membership.householdId,
                sentByUserId: user.userId,
                invitedEmail,
                code,
                expiresAt
            }
        });

        let emailed = false;
        if (invitedEmail) {
            const emailResult = await sendInviteEmail({
                to: invitedEmail,
                code,
                householdName: membership.household.name,
                expiresAtIso: expiresAt.toISOString()
            });
            emailed = emailResult.sent;
        }

        return {
            success: true,
            data: {
                code,
                expiresAt: expiresAt.toISOString(),
                emailed
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar convite"
        };
    }
}

export async function joinHouseholdByCode(codeInput: string): Promise<ActionResponse<{ householdId: string }>> {
    try {
        const user = await requireAuthUser();
        const code = normalizeInviteCode(codeInput);

        if (code.length !== 6) {
            return { success: false, error: "Código precisa ter 6 dígitos" };
        }

        const invite = await prisma.householdInvite.findFirst({
            where: {
                code,
                acceptedAt: null,
                expiresAt: {
                    gt: new Date()
                }
            }
        });

        if (!invite) {
            return { success: false, error: "Convite inválido ou expirado" };
        }

        await prisma.$transaction([
            prisma.householdMember.upsert({
                where: {
                    householdId_userId: {
                        householdId: invite.householdId,
                        userId: user.userId
                    }
                },
                update: {},
                create: {
                    householdId: invite.householdId,
                    userId: user.userId,
                    role: "MEMBER"
                }
            }),
            prisma.householdInvite.update({
                where: { id: invite.id },
                data: {
                    acceptedAt: new Date(),
                    acceptedByUser: user.userId
                }
            })
        ]);

        return {
            success: true,
            data: {
                householdId: invite.householdId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao entrar no space"
        };
    }
}
