"use server";

import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/utils";
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
    const replyTo = process.env.INVITE_REPLY_TO;

    if (!apiKey || !fromEmail) {
        return {
            sent: false as const,
            reason: "missing_env" as const,
            message:
                "Defina RESEND_API_KEY e INVITE_FROM_EMAIL para enviar convites.",
        };
    }

    if (/(@gmail\.com|@hotmail\.com|@outlook\.com|@yahoo\.com)/i.test(fromEmail)) {
        return {
            sent: false as const,
            reason: "missing_env" as const,
            message:
                "INVITE_FROM_EMAIL precisa ser um remetente validado no Resend (dominio proprio ou onboarding@resend.dev em teste).",
        };
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const inviteLink = `${appUrl}/accept-invite?code=${encodeURIComponent(params.code)}&email=${encodeURIComponent(params.to)}`;
    const formattedExpiration = new Date(params.expiresAtIso).toLocaleString("pt-BR");

    const textBody = [
        "My Finances - Convite para space",
        "",
        `Você recebeu um convite para entrar no space \"${params.householdName}\".`,
        "",
        `Codigo do convite: ${params.code}`,
        `Link para aceitar: ${inviteLink}`,
        `Validade: ${formattedExpiration}`,
        "",
        "Se você não esperava este email, pode ignorar esta mensagem.",
    ].join("\n");

    const htmlBody = `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827;">
            <p style="margin: 0 0 12px;"><strong>My Finances</strong></p>
            <p style="margin: 0 0 12px;">Você recebeu um convite para entrar no space <strong>${params.householdName}</strong>.</p>
            <p style="margin: 0 0 8px;">Use o código abaixo para confirmar seu acesso:</p>
            <p style="margin: 0 0 16px; font-size: 22px; font-weight: 700; letter-spacing: 3px;">${params.code}</p>
            <p style="margin: 0 0 16px;">
                <a href="${inviteLink}" style="display:inline-block; background:#4f46e5; color:#ffffff; text-decoration:none; padding:10px 14px; border-radius:8px; font-weight:600;">
                    Aceitar convite
                </a>
            </p>
            <p style="margin: 0 0 8px; font-size: 14px; color: #374151;">Link direto: <a href="${inviteLink}" style="color:#1d4ed8;">${inviteLink}</a></p>
            <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">Validade: ${formattedExpiration}</p>
            <hr style="border:0; border-top:1px solid #e5e7eb; margin: 16px 0;" />
            <p style="margin: 0; font-size: 12px; color: #6b7280;">Você recebeu este email porque um membro do My Finances convidou este endereço para participar de um space.</p>
            <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Se não foi você, ignore esta mensagem.</p>
        </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: fromEmail,
            to: [params.to],
            ...(replyTo ? { reply_to: replyTo } : {}),
            subject: `Convite para acessar o space ${params.householdName} no My Finances`,
            text: textBody,
            html: htmlBody,
        })
    });

    if (!response.ok) {
        const providerPayload = await response
            .json()
            .catch(() => null as { message?: string } | null);
        return {
            sent: false as const,
            reason: "provider_error" as const,
            message:
                providerPayload?.message ||
                `Resend retornou erro HTTP ${response.status}.`,
        };
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

        const code = generateInviteCode();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

        const invite = await prisma.householdInvite.create({
            data: {
                householdId: membership.householdId,
                sentByUserId: user.userId,
                invitedEmail: normalizedEmail,
                code,
                expiresAt
            }
        });

        const emailResult = await sendInviteEmail({
            to: normalizedEmail,
            code,
            householdName: membership.household.name,
            expiresAtIso: expiresAt.toISOString()
        });

        if (!emailResult.sent) {
            await prisma.householdInvite.delete({
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
                code,
                expiresAt: expiresAt.toISOString(),
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar convite"
        };
    }
}
