import { prisma } from "@/lib/prisma";

export async function listUserSpaces(userId: string) {
    const memberships = await prisma.householdMember.findMany({
        where: { userId },
        include: {
            household: {
                include: {
                    _count: {
                        select: {
                            members: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            joinedAt: "asc",
        },
    });

    return memberships.map((membership) => ({
        householdId: membership.householdId,
        householdName: membership.household.name,
        role: membership.role,
        memberCount: membership.household._count.members,
    }));
}

export async function getHouseholdContext(userId: string, householdId?: string) {
    const membership = await prisma.householdMember.findFirst({
        where: {
            userId,
            ...(householdId ? { householdId } : {}),
        },
        include: {
            household: {
                include: {
                    members: {
                        include: {
                            user: true
                        }
                    },
                    categories: {
                        orderBy: { name: "asc" }
                    }
                }
            }
        }
    });

    if (!membership) {
        return null;
    }

    const partner = membership.household.members.find((member) => member.userId !== userId)?.user;
    const members = membership.household.members.map((member) => ({
        id: member.user.id,
        name: member.user.name ?? member.user.email,
        email: member.user.email,
        role: member.role,
    }));

    return {
        householdId: membership.householdId,
        householdName: membership.household.name,
        categories: membership.household.categories,
        members,
        partner: partner
            ? {
                id: partner.id,
                name: partner.name ?? partner.email,
                email: partner.email
            }
            : null
    };
}
