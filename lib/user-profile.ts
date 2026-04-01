import { prisma } from "@/lib/prisma";

interface SyncUserProfileInput {
    authUserId: string;
    email: string;
    name?: string | null;
}

export async function syncUserProfile(input: SyncUserProfileInput) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedName = input.name?.trim() || normalizedEmail.split("@")[0];

    const existingById = await prisma.user.findUnique({
        where: { id: input.authUserId },
    });

    if (existingById) {
        return prisma.user.update({
            where: { id: existingById.id },
            data: {
                email: normalizedEmail,
                name: normalizedName,
            },
        });
    }

    const existingByEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
    });

    if (existingByEmail) {
        return prisma.user.update({
            where: { id: existingByEmail.id },
            data: {
                email: normalizedEmail,
                name: normalizedName,
            },
        });
    }

    return prisma.user.create({
        data: {
            id: input.authUserId,
            email: normalizedEmail,
            name: normalizedName,
        },
    });
}
