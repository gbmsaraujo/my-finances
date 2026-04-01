import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
    const prisma = {
        householdMember: {
            findFirst: vi.fn(),
        },
        householdInvite: {
            create: vi.fn(),
            delete: vi.fn(),
        },
    };

    return {
        prisma,
        requireAuthUser: vi.fn(),
        fetch: vi.fn(),
    };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/auth", () => ({ requireAuthUser: mocks.requireAuthUser }));

import { createInviteCode } from "./household";

describe("household actions - convite por email", () => {
    const oldResend = process.env.RESEND_API_KEY;
    const oldFrom = process.env.INVITE_FROM_EMAIL;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireAuthUser.mockResolvedValue({ userId: "owner-1" });
        mocks.prisma.householdMember.findFirst.mockResolvedValue({
            householdId: "house-1",
            household: { name: "Casa" },
        });
        mocks.prisma.householdInvite.create.mockResolvedValue({ id: "invite-1" });
        mocks.prisma.householdInvite.delete.mockResolvedValue({ id: "invite-1" });
        global.fetch = mocks.fetch as unknown as typeof fetch;
    });

    afterEach(() => {
        process.env.RESEND_API_KEY = oldResend;
        process.env.INVITE_FROM_EMAIL = oldFrom;
    });

    it("retorna erro quando email não é informado", async () => {
        const result = await createInviteCode("", "house-1");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Informe um email");
        expect(mocks.requireAuthUser).not.toHaveBeenCalled();
    });

    it("retorna erro quando variáveis do Resend não existem", async () => {
        delete process.env.RESEND_API_KEY;
        delete process.env.INVITE_FROM_EMAIL;

        const result = await createInviteCode("convidado@teste.com", "house-1");

        expect(result.success).toBe(false);
        expect(result.error).toContain(
            "Defina RESEND_API_KEY e INVITE_FROM_EMAIL",
        );
    });

    it("gera convite e envia email quando Resend está configurado", async () => {
        process.env.RESEND_API_KEY = "re_xxx";
        process.env.INVITE_FROM_EMAIL = "invite@teste.com";
        mocks.fetch.mockResolvedValue({ ok: true });

        const result = await createInviteCode("Convidado@Teste.Com", "house-1");

        expect(result.success).toBe(true);
        expect(result.data?.code).toBeTruthy();
        expect(mocks.prisma.householdInvite.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    invitedEmail: "convidado@teste.com",
                    householdId: "house-1",
                }),
            }),
        );
    });
});
