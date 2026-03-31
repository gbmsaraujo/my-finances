import { prisma } from "@/lib/prisma";

export async function getHouseholdContext(userId: string) {
    const membership = await prisma.householdMember.findFirst({
        where: { userId },
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

    return {
        householdId: membership.householdId,
        householdName: membership.household.name,
        categories: membership.household.categories,
        partner: partner
            ? {
                id: partner.id,
                name: partner.name ?? partner.email,
                email: partner.email
            }
            : null
    };
}
