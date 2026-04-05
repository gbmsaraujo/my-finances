import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/app-url";

export type ValidationCodeType = "SIGNUP" | "FORGOT_PASSWORD" | "INVITE";

const VALIDATION_CODE_TTL_MS = 5 * 60 * 1000;

export function generateValidationCode() {
    return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export async function createValidationCode(params: {
    type: ValidationCodeType;
    email: string;
    userId?: string | null;
    householdId?: string | null;
}) {
    const email = normalizeEmail(params.email);
    const expiresAt = new Date(Date.now() + VALIDATION_CODE_TTL_MS);

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateValidationCode();
        const existing = await prisma.validationCode.findUnique({
            where: {
                type_code: {
                    type: params.type,
                    code,
                },
            },
        });

        if (existing) {
            continue;
        }

        return prisma.validationCode.create({
            data: {
                type: params.type,
                email,
                code,
                userId: params.userId ?? null,
                householdId: params.householdId ?? null,
                expiresAt,
            },
        });
    }

    throw new Error("Não foi possível gerar um código único");
}

export async function findActiveValidationCode(params: {
    type: ValidationCodeType;
    code: string;
    email: string;
}) {
    const email = normalizeEmail(params.email);
    const record = await prisma.validationCode.findUnique({
        where: {
            type_code: {
                type: params.type,
                code: params.code,
            },
        },
    });

    if (!record || record.email !== email) {
        return null;
    }

    if (record.usedAt || record.expiresAt <= new Date()) {
        return null;
    }

    return record;
}

export async function consumeValidationCode(params: {
    type: ValidationCodeType;
    code: string;
    email: string;
}) {
    const record = await findActiveValidationCode(params);

    if (!record) {
        return null;
    }

    return prisma.validationCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
    });
}

export function buildValidationCodeLink(params: {
    path: string;
    code: string;
    email: string;
    type: ValidationCodeType;
    next?: string;
}) {
    const url = new URL(params.path, getAppUrl());
    url.searchParams.set("code", params.code);
    url.searchParams.set("email", params.email);
    url.searchParams.set("type", params.type.toLowerCase());

    if (params.next) {
        url.searchParams.set("next", params.next);
    }

    return url.toString();
}