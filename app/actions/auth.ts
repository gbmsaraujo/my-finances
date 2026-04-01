"use server";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeInviteCode } from "@/lib/utils";
import { syncUserProfile } from "@/lib/user-profile";

interface ActionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    code?:
    | "USER_NOT_FOUND"
    | "RATE_LIMITED"
    | "INVALID_CREDENTIALS"
    | "EMAIL_NOT_CONFIRMED"
    | "EMAIL_ALREADY_EXISTS";
    retryAfterSeconds?: number;
}

function mapPasswordAuthError(
    errorMessage: string,
): Pick<ActionResponse<null>, "error" | "code" | "retryAfterSeconds"> {
    if (/rate limit|too many requests|email rate limit/i.test(errorMessage)) {
        return {
            code: "RATE_LIMITED",
            error: "Limite de envio de email atingido. Aguarde 60 segundos e tente novamente.",
            retryAfterSeconds: 60,
        };
    }

    if (/invalid login credentials/i.test(errorMessage)) {
        return {
            code: "INVALID_CREDENTIALS",
            error: "Email ou senha inválidos."
        };
    }

    if (/email not confirmed/i.test(errorMessage)) {
        return {
            code: "EMAIL_NOT_CONFIRMED",
            error: "Confirme seu email para concluir o acesso."
        };
    }

    return { error: errorMessage };
}
function isUserAlreadyRegisteredError(errorMessage: string) {
    return /already registered|already been registered|user already exists/i.test(
        errorMessage,
    );
}

async function ensurePasswordUser(params: {
    email: string;
    password: string;
    name: string;
    allowExisting?: boolean;
}): Promise<
    ActionResponse<{
        userId: string;
        emailConfirmationRequired: boolean;
    }>
> {
    const supabase = createSupabaseServerClient();

    const { error, data } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
            data: {
                name: params.name,
            },
        },
    });

    if (error && !isUserAlreadyRegisteredError(error.message)) {
        return {
            success: false,
            ...mapPasswordAuthError(error.message),
        };
    }

    if (error && isUserAlreadyRegisteredError(error.message) && !params.allowExisting) {
        return {
            success: false,
            code: "EMAIL_ALREADY_EXISTS",
            error: "Email já cadastrado.",
        };
    }

    if (!data.user) {
        const signInResult = await supabase.auth.signInWithPassword({
            email: params.email,
            password: params.password,
        });

        if (signInResult.error || !signInResult.data.user) {
            return {
                success: false,
                ...mapPasswordAuthError(
                    signInResult.error?.message ?? "Não foi possível autenticar",
                ),
            };
        }

        return {
            success: true,
            data: {
                userId: signInResult.data.user.id,
                emailConfirmationRequired: false,
            },
        };
    }

    if (!data.session) {
        return {
            success: true,
            data: {
                userId: data.user.id,
                emailConfirmationRequired: true,
            },
        };
    }

    return {
        success: true,
        data: {
            userId: data.user.id,
            emailConfirmationRequired: false,
        },
    };
}


export async function signInWithPassword(email: string, password: string): Promise<ActionResponse<{ needsOnboarding: boolean }>> {
    try {
        const normalizedEmail = email.trim().toLowerCase();

        const existingProfile = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (!existingProfile) {
            return {
                success: false,
                code: "USER_NOT_FOUND",
                error: "Email não cadastrado. Crie sua conta para continuar."
            };
        }

        const supabase = createSupabaseServerClient();

        const { error, data } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
        });

        if (error || !data.user) {
            return {
                success: false,
                ...mapPasswordAuthError(error?.message ?? "Não foi possível entrar")
            };
        }

        const profile = await syncUserProfile({
            authUserId: data.user.id,
            email: data.user.email ?? normalizedEmail,
            name: data.user.user_metadata?.name,
        });

        const membership = await prisma.householdMember.findFirst({
            where: { userId: profile.id }
        });

        return {
            success: true,
            data: {
                needsOnboarding: !membership,
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao entrar"
        };
    }
}

export async function signUpWithPassword(
    email: string,
    password: string,
    name: string,
): Promise<ActionResponse<{ needsOnboarding: boolean; emailConfirmationRequired: boolean }>> {
    try {
        const normalizedEmail = email.trim().toLowerCase();
        const trimmedName = name.trim();

        const existingProfile = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingProfile) {
            return {
                success: false,
                code: "EMAIL_ALREADY_EXISTS",
                error: "Email já cadastrado.",
            };
        }

        const ensuredUser = await ensurePasswordUser({
            email: normalizedEmail,
            password,
            name: trimmedName,
            allowExisting: false,
        });

        if (!ensuredUser.success || !ensuredUser.data) {
            return {
                success: false,
                code: ensuredUser.code,
                error: ensuredUser.error,
                retryAfterSeconds: ensuredUser.retryAfterSeconds,
            };
        }

        const profileName = trimmedName || normalizedEmail.split("@")[0];

        await syncUserProfile({
            authUserId: ensuredUser.data.userId,
            email: normalizedEmail,
            name: profileName,
        });

        return {
            success: true,
            data: {
                needsOnboarding: true,
                emailConfirmationRequired:
                    ensuredUser.data.emailConfirmationRequired,
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar conta"
        };
    }
}

export async function registerInvitedUserWithPassword(
    codeInput: string,
    email: string,
    password: string,
    name: string,
): Promise<ActionResponse<{ householdId: string; emailConfirmationRequired: boolean }>> {
    try {
        const code = normalizeInviteCode(codeInput);
        const normalizedEmail = email.trim().toLowerCase();
        const trimmedName = name.trim();

        if (code.length !== 6) {
            return { success: false, error: "Código de convite inválido" };
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

        const ensuredUser = await ensurePasswordUser({
            email: normalizedEmail,
            password,
            name: trimmedName,
            allowExisting: true,
        });

        if (!ensuredUser.success || !ensuredUser.data) {
            return {
                success: false,
                code: ensuredUser.code,
                error: ensuredUser.error,
                retryAfterSeconds: ensuredUser.retryAfterSeconds,
            };
        }

        const userId = ensuredUser.data.userId;
        const profileName = trimmedName || normalizedEmail.split("@")[0];

        await prisma.$transaction([
            syncUserProfile({
                authUserId: userId,
                email: normalizedEmail,
                name: profileName,
            }),
            prisma.householdMember.upsert({
                where: {
                    householdId_userId: {
                        householdId: invite.householdId,
                        userId,
                    }
                },
                update: {},
                create: {
                    householdId: invite.householdId,
                    userId,
                    role: "MEMBER",
                }
            }),
            prisma.householdInvite.update({
                where: { id: invite.id },
                data: {
                    acceptedAt: new Date(),
                    acceptedByUser: userId,
                }
            })
        ]);

        return {
            success: true,
            data: {
                householdId: invite.householdId,
                emailConfirmationRequired:
                    ensuredUser.data.emailConfirmationRequired,
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao aceitar convite"
        };
    }
}

export async function getInvitePreview(codeInput: string): Promise<ActionResponse<{ householdName: string }>> {
    try {
        const code = normalizeInviteCode(codeInput);

        if (code.length !== 6) {
            return { success: false, error: "Código inválido" };
        }

        const invite = await prisma.householdInvite.findFirst({
            where: {
                code,
                acceptedAt: null,
                expiresAt: {
                    gt: new Date(),
                }
            },
            include: {
                household: true,
            }
        });

        if (!invite) {
            return { success: false, error: "Convite inválido ou expirado" };
        }

        return {
            success: true,
            data: {
                householdName: invite.household.name,
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao validar convite"
        };
    }
}

export async function signOut(): Promise<ActionResponse<null>> {
    try {
        const supabase = createSupabaseServerClient();
        const { error } = await supabase.auth.signOut();

        if (error) {
            return {
                success: false,
                error: error.message || "Não foi possível sair da conta",
            };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao sair da conta",
        };
    }
}

function getAppUrl() {
    return (
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
        "http://localhost:3000"
    );
}

export async function requestPasswordReset(
    email: string,
): Promise<ActionResponse<null>> {
    try {
        const normalizedEmail = email.trim().toLowerCase();

        const existingProfile = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!existingProfile) {
            return {
                success: false,
                code: "USER_NOT_FOUND",
                error: "Email não cadastrado.",
            };
        }

        const supabase = createSupabaseServerClient();
        const redirectTo = `${getAppUrl()}/auth/verify?next=/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(
            normalizedEmail,
            { redirectTo },
        );

        if (error) {
            return {
                success: false,
                ...mapPasswordAuthError(error.message),
            };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Erro ao enviar email de redefinição",
        };
    }
}

export async function updateCurrentUserPassword(
    newPassword: string,
): Promise<ActionResponse<null>> {
    try {
        const supabase = createSupabaseServerClient();

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                success: false,
                error: "Sessão inválida para redefinir senha. Solicite um novo link.",
            };
        }

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            return {
                success: false,
                ...mapPasswordAuthError(error.message),
            };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Erro ao atualizar senha",
        };
    }
}
