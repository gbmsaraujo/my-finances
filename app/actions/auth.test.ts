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
        householdInvite: {
            findFirst: vi.fn(),
            update: vi.fn(),
        },
        $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
    };

    const supabaseClient = {
        auth: {
            signInWithPassword: vi.fn(),
            signUp: vi.fn(),
            getUser: vi.fn(),
            signOut: vi.fn(),
        },
    };

    return {
        prisma,
        supabaseClient,
        createSupabaseServerClient: vi.fn(),
        syncUserProfile: vi.fn(),
    };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/supabase/server", () => ({
    createSupabaseServerClient: mocks.createSupabaseServerClient,
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
        mocks.supabaseClient.auth.signUp.mockResolvedValue({
            error: { message: "Email rate limit exceeded" },
            data: { user: null, session: null },
        });

        const result = await signUpWithPassword("novo@teste.com", "123456", "Novo User");

        expect(result.success).toBe(false);
        expect(result.code).toBe("RATE_LIMITED");
        expect(result.retryAfterSeconds).toBe(60);
    });

    it("signUpWithPassword conclui cadastro sem confirmação quando supabase retorna sessão", async () => {
        mocks.prisma.user.findUnique.mockResolvedValue(null);
        mocks.supabaseClient.auth.signUp.mockResolvedValue({
            error: null,
            data: {
                user: {
                    id: "user-auth",
                    email: "novo@teste.com",
                    user_metadata: { name: "Novo User" },
                },
                session: { access_token: "token" },
            },
        });
        mocks.prisma.user.upsert.mockResolvedValue({ id: "user-auth" });

        const result = await signUpWithPassword(
            "novo@teste.com",
            "123456",
            "Novo User",
        );

        expect(result.success).toBe(true);
        expect(result.data?.emailConfirmationRequired).toBe(false);
        expect(mocks.supabaseClient.auth.signUp).toHaveBeenCalled();
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
        expect(mocks.supabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it("registerInvitedUserWithPassword valida convite e conclui associação ao household", async () => {
        mocks.prisma.householdInvite.findFirst.mockResolvedValue({
            id: "invite-1",
            householdId: "house-1",
        });
        mocks.supabaseClient.auth.signUp.mockResolvedValue({
            error: null,
            data: {
                user: {
                    id: "user-auth",
                    email: "convite@teste.com",
                    user_metadata: { name: "Convidado" },
                },
                session: { access_token: "token" },
            },
        });
        mocks.prisma.user.upsert.mockResolvedValue({ id: "user-auth" });
        mocks.prisma.householdMember.upsert.mockResolvedValue({});
        mocks.prisma.householdInvite.update.mockResolvedValue({});

        const result = await registerInvitedUserWithPassword(
            "123456",
            "convite@teste.com",
            "123456",
            "Convidado",
        );

        expect(result.success).toBe(true);
        expect(result.data?.householdId).toBe("house-1");
        expect(mocks.prisma.householdInvite.update).toHaveBeenCalled();
    });
});
