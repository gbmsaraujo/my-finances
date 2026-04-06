import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
    const prisma = {
        user: {
            findUnique: vi.fn(),
            upsert: vi.fn(),
        },
        householdMember: {
            findFirst: vi.fn(),
            upsert: vi.fn(),
        },
        validationCode: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
    };

    const supabaseAdminClient = {
        auth: {
            admin: {
                createUser: vi.fn(),
                generateLink: vi.fn(),
                updateUserById: vi.fn(),
            },
        },
    };

    const supabaseClient = {
        auth: {
            signUp: vi.fn(),
            signInWithPassword: vi.fn(),
            getUser: vi.fn(),
            signOut: vi.fn(),
        },
    };

    return {
        prisma,
        supabaseClient,
        supabaseAdminClient,
        createSupabaseServerClient: vi.fn(),
        createSupabaseAdminClient: vi.fn(),
        syncUserProfile: vi.fn(),
        sendResendEmail: vi.fn(),
    };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/supabase/server", () => ({
    createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@/lib/supabase/admin", () => ({
    createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));
vi.mock("@/lib/email", () => ({
    sendResendEmail: mocks.sendResendEmail,
}));
vi.mock("@/lib/user-profile", () => ({
    syncUserProfile: mocks.syncUserProfile,
}));

import {
    registerInvitedUserWithPassword,
    signInWithPassword,
    signUpWithPassword,
} from "./auth";

describe("auth actions - fluxo simples", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.createSupabaseServerClient.mockReturnValue(mocks.supabaseClient);
        mocks.createSupabaseAdminClient.mockReturnValue(mocks.supabaseAdminClient);
        mocks.sendResendEmail.mockResolvedValue({ sent: true });
        mocks.supabaseClient.auth.signInWithPassword.mockResolvedValue({
            error: null,
            data: {
                user: {
                    id: "user-auth",
                    email: "user@teste.com",
                    user_metadata: { name: "User" },
                },
            },
        });
        mocks.supabaseClient.auth.signUp.mockResolvedValue({
            error: null,
            data: {
                user: {
                    id: "user-auth",
                },
            },
        });
        mocks.prisma.validationCode.findUnique.mockResolvedValue(null);
        mocks.prisma.validationCode.create.mockResolvedValue({
            id: "code-1",
            code: "123456",
            expiresAt: new Date(Date.now() + 300000),
        });
        mocks.syncUserProfile.mockResolvedValue({
            id: "user-auth",
            email: "user@teste.com",
            name: "User",
        });
    });

    it("signInWithPassword retorna USER_NOT_FOUND quando email não existe", async () => {
        mocks.prisma.user.findUnique.mockResolvedValue(null);

        const result = await signInWithPassword("naoexiste@teste.com", "123456");

        expect(result.success).toBe(false);
        expect(result.code).toBe("USER_NOT_FOUND");
        expect(mocks.supabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("signInWithPassword autentica e retorna needsOnboarding=true sem membership", async () => {
        mocks.prisma.user.findUnique.mockResolvedValue({ id: "user-local" });
        mocks.supabaseClient.auth.signInWithPassword.mockResolvedValue({
            error: null,
            data: {
                user: {
                    id: "user-auth",
                    email: "user@teste.com",
                    user_metadata: { name: "User" },
                },
            },
        });
        mocks.prisma.user.upsert.mockResolvedValue({ id: "user-auth", email: "user@teste.com" });
        mocks.prisma.householdMember.findFirst.mockResolvedValue(null);

        const result = await signInWithPassword("user@teste.com", "123456");

        expect(result.success).toBe(true);
        expect(result.data?.needsOnboarding).toBe(true);
    });

    it("signUpWithPassword retorna RATE_LIMITED quando supabase limita envio", async () => {
        mocks.prisma.user.findUnique.mockResolvedValue(null);
        mocks.supabaseAdminClient.auth.admin.createUser.mockResolvedValue({
            error: { message: "Email rate limit exceeded" },
            data: { user: null },
        });

        const result = await signUpWithPassword("novo@teste.com", "123456", "Novo User");

        expect(result.success).toBe(false);
        expect(result.code).toBe("RATE_LIMITED");
        expect(result.retryAfterSeconds).toBe(60);
    });

    it("signUpWithPassword conclui cadastro sem confirmação quando supabase retorna sessão", async () => {
        mocks.prisma.user.findUnique.mockResolvedValue(null);
        mocks.supabaseAdminClient.auth.admin.createUser.mockResolvedValue({
            error: null,
            data: {
                user: {
                    id: "user-auth",
                    email: "novo@teste.com",
                    user_metadata: { name: "Novo User" },
                },
            },
        });
        mocks.supabaseClient.auth.signInWithPassword.mockResolvedValue({
            error: null,
            data: {
                user: {
                    id: "user-auth",
                    email: "novo@teste.com",
                    user_metadata: { name: "Novo User" },
                },
            },
        });
        mocks.prisma.user.upsert.mockResolvedValue({ id: "user-auth" });

        const result = await signUpWithPassword(
            "novo@teste.com",
            "123456",
            "Novo User",
        );

        expect(result.success).toBe(true);
        expect(result.data?.needsOnboarding).toBe(true);
        expect(mocks.supabaseAdminClient.auth.admin.createUser).toHaveBeenCalled();
        expect(mocks.supabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
            email: "novo@teste.com",
            password: "123456",
        });
    });

    it("signUpWithPassword bloqueia email já cadastrado", async () => {
        mocks.prisma.user.findUnique.mockResolvedValue({
            id: "existing-user",
            email: "novo@teste.com",
        });

        const result = await signUpWithPassword(
            "novo@teste.com",
            "123456",
            "Novo User",
        );

        expect(result.success).toBe(false);
        expect(result.code).toBe("EMAIL_ALREADY_EXISTS");
        expect(mocks.supabaseAdminClient.auth.admin.createUser).not.toHaveBeenCalled();
    });

    it("registerInvitedUserWithPassword valida convite e conclui associação ao household", async () => {
        mocks.prisma.validationCode.findUnique.mockResolvedValue({
            id: "invite-1",
            householdId: "house-1",
            email: "convite@teste.com",
            code: "123456",
            expiresAt: new Date(Date.now() + 300000),
        });
        mocks.supabaseAdminClient.auth.admin.createUser.mockResolvedValue({
            error: null,
            data: {
                user: {
                    id: "user-auth",
                    email: "convite@teste.com",
                    user_metadata: { name: "Convidado" },
                },
            },
        });
        mocks.prisma.user.upsert.mockResolvedValue({ id: "user-auth" });
        mocks.prisma.householdMember.upsert.mockResolvedValue({});
        mocks.prisma.validationCode.update.mockResolvedValue({});

        const result = await registerInvitedUserWithPassword(
            "123456",
            "convite@teste.com",
            "123456",
            "Convidado",
        );

        expect(result.success).toBe(true);
        expect(result.data?.householdId).toBe("house-1");
        expect(mocks.prisma.validationCode.update).toHaveBeenCalled();
    });

    it("registerInvitedUserWithPassword usa fallback sem service role key", async () => {
        mocks.prisma.validationCode.findUnique.mockResolvedValue({
            id: "invite-1",
            householdId: "house-1",
            email: "convite@teste.com",
            code: "123456",
            expiresAt: new Date(Date.now() + 300000),
        });
        mocks.createSupabaseAdminClient.mockImplementation(() => {
            throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida");
        });
        mocks.supabaseClient.auth.signUp.mockResolvedValue({
            error: null,
            data: {
                user: {
                    id: "user-auth",
                },
            },
        });
        mocks.prisma.user.upsert.mockResolvedValue({ id: "user-auth" });
        mocks.prisma.householdMember.upsert.mockResolvedValue({});
        mocks.prisma.validationCode.update.mockResolvedValue({});

        const result = await registerInvitedUserWithPassword(
            "123456",
            "convite@teste.com",
            "123456",
            "Convidado",
        );

        expect(result.success).toBe(true);
        expect(result.data?.householdId).toBe("house-1");
        expect(mocks.supabaseClient.auth.signUp).toHaveBeenCalledWith(
            expect.objectContaining({
                email: "convite@teste.com",
                password: "123456",
            }),
        );
        expect(mocks.prisma.validationCode.update).toHaveBeenCalled();
    });

    it("requestPasswordReset cria código e envia email por Resend", async () => {
        process.env.RESEND_API_KEY = "re_xxx";
        process.env.INVITE_FROM_EMAIL = "noreply@financegroup.app";
        mocks.prisma.user.findUnique.mockResolvedValue({ id: "user-auth", email: "user@teste.com" });
        mocks.prisma.validationCode.findUnique.mockResolvedValue(null);
        mocks.prisma.validationCode.create.mockResolvedValue({
            id: "reset-1",
            code: "654321",
            expiresAt: new Date(Date.now() + 300000),
        });

        const { requestPasswordReset } = await import("./auth");
        const result = await requestPasswordReset("user@teste.com");

        expect(result.success).toBe(true);
        expect(mocks.sendResendEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "user@teste.com",
                fromEnvKey: "INVITE_FROM_EMAIL",
            }),
        );
        expect(mocks.prisma.validationCode.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    type: "FORGOT_PASSWORD",
                    email: "user@teste.com",
                }),
            }),
        );
    });

    it("updateCurrentUserPassword altera senha usando código validado", async () => {
        mocks.prisma.validationCode.findUnique.mockResolvedValue({
            id: "reset-1",
            email: "user@teste.com",
            code: "654321",
            expiresAt: new Date(Date.now() + 300000),
            usedAt: null,
        });
        mocks.prisma.user.findUnique.mockResolvedValue({
            id: "user-auth",
            email: "user@teste.com",
        });
        mocks.supabaseAdminClient.auth.admin.updateUserById.mockResolvedValue({ error: null });
        mocks.prisma.validationCode.update.mockResolvedValue({});

        const { updateCurrentUserPassword } = await import("./auth");
        const result = await updateCurrentUserPassword(
            "nova-senha",
            "654321",
            "user@teste.com",
        );

        expect(result.success).toBe(true);
        expect(mocks.supabaseAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
            "user-auth",
            expect.objectContaining({ password: "nova-senha" }),
        );
        expect(mocks.prisma.validationCode.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "reset-1" },
            }),
        );
    });
});
