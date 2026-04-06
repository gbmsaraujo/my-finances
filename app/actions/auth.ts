"use server";

import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeInviteCode } from "@/lib/utils";
import {
    consumeValidationCode,
    createValidationCode,
    findActiveValidationCode,
} from "@/lib/validation-codes";
import { sendVerificationEmail } from "@/lib/verification-email";
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
    | "EMAIL_ALREADY_EXISTS"
    | "INVALID_OR_EXPIRED_CODE";
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
    }>
> {
    const supabase = createSupabaseServerClient();

    try {
        const supabaseAdmin = createSupabaseAdminClient();

        const { error, data } = await supabaseAdmin.auth.admin.createUser({
            email: params.email,
            password: params.password,
            email_confirm: true,
            user_metadata: {
                name: params.name,
            },
        });

        if (error && !isUserAlreadyRegisteredError(error.message)) {
            return {
                success: false,
                ...mapPasswordAuthError(error.message),
            };
        }

        if (
            error &&
            isUserAlreadyRegisteredError(error.message) &&
            !params.allowExisting
        ) {
            return {
                success: false,
                code: "EMAIL_ALREADY_EXISTS",
                error: "Email já cadastrado.",
            };
        }

        if (!data.user && !params.allowExisting) {
            return {
                success: false,
                error: "Não foi possível criar a conta",
            };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "";

        if (!/SUPABASE_SERVICE_ROLE_KEY/i.test(errorMessage)) {
            throw error;
        }

        const { error: signUpError } = await supabase.auth.signUp({
            email: params.email,
            password: params.password,
            options: {
                data: {
                    name: params.name,
                },
            },
        });

        if (signUpError && !isUserAlreadyRegisteredError(signUpError.message)) {
            return {
                success: false,
                ...mapPasswordAuthError(signUpError.message),
            };
        }

        if (
            signUpError &&
            isUserAlreadyRegisteredError(signUpError.message) &&
            !params.allowExisting
        ) {
            return {
                success: false,
                code: "EMAIL_ALREADY_EXISTS",
                error: "Email já cadastrado.",
            };
        }
    }

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
): Promise<ActionResponse<{ needsOnboarding: boolean }>> {
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

        const invite = await findActiveValidationCode({
            type: "INVITE",
            code,
            email: normalizedEmail,
        });

        if (!invite) {
            return { success: false, error: "Convite inválido ou expirado" };
        }

        if (!invite.householdId) {
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

        await syncUserProfile({
            authUserId: userId,
            email: normalizedEmail,
            name: profileName,
        });

        await prisma.householdMember.upsert({
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
        });

        await consumeValidationCode({
            type: "INVITE",
            code,
            email: normalizedEmail,
        });

        return {
            success: true,
            data: {
                householdId: invite.householdId,
                emailConfirmationRequired: false,
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

        const invite = await prisma.validationCode.findFirst({
            where: {
                type: "INVITE",
                code,
                usedAt: null,
                expiresAt: {
                    gt: new Date(),
                },
            },
            include: {
                household: true,
            }
        });

        if (!invite || !invite.household) {
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

        const validationCode = await createValidationCode({
            type: "FORGOT_PASSWORD",
            email: normalizedEmail,
        });

        const emailResult = await sendVerificationEmail({
            type: "forgot-password",
            to: normalizedEmail,
            code: validationCode.code,
            expiresAtIso: validationCode.expiresAt.toISOString(),
        });

        if (!emailResult.sent) {
            await prisma.validationCode.delete({
                where: { id: validationCode.id },
            });

            if (emailResult.reason === "missing_env") {
                return {
                    success: false,
                    error:
                        emailResult.message ||
                        "Configuração de email ausente. Defina RESEND_API_KEY e RESET_FROM_EMAIL.",
                };
            }

            return {
                success: false,
                error:
                    emailResult.message ||
                    "Falha ao enviar email de redefinição. Tente novamente em instantes.",
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
    codeInput?: string,
    email?: string,
): Promise<ActionResponse<null>> {
    try {
        if (codeInput && email) {
            const normalizedEmail = email.trim().toLowerCase();
            const code = normalizeInviteCode(codeInput);

            if (code.length !== 6) {
                return {
                    success: false,
                    code: "INVALID_OR_EXPIRED_CODE",
                    error: "Código inválido ou expirado. Solicite um novo link.",
                };
            }

            const validationCode = await findActiveValidationCode({
                type: "FORGOT_PASSWORD",
                code,
                email: normalizedEmail,
            });

            if (!validationCode) {
                return {
                    success: false,
                    code: "INVALID_OR_EXPIRED_CODE",
                    error: "Código inválido ou expirado. Solicite um novo link.",
                };
            }

            const user = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (!user) {
                return {
                    success: false,
                    code: "USER_NOT_FOUND",
                    error: "Email não cadastrado.",
                };
            }

            const supabaseAdmin = createSupabaseAdminClient();
            const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
                password: newPassword,
            });

            if (error) {
                return {
                    success: false,
                    ...mapPasswordAuthError(error.message),
                };
            }

            await consumeValidationCode({
                type: "FORGOT_PASSWORD",
                code,
                email: normalizedEmail,
            });

            return { success: true };
        }

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
