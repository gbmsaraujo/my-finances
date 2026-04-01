import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function assertProductionSeedSafety() {
    if (process.env.NODE_ENV !== "production") {
        return;
    }

    if (process.env.SEED_PROD !== "true") {
        throw new Error(
            "Seed em produção bloqueado. Defina SEED_PROD=true para executar explicitamente."
        );
    }
}

async function main() {
    assertProductionSeedSafety();

    const ownerEmail = "gabriel@example.com";

    const owner = await prisma.user.upsert({
        where: { email: ownerEmail },
        update: {
            name: "Gabriel"
        },
        create: {
            email: ownerEmail,
            name: "Gabriel"
        }
    });

    const household = await prisma.household.upsert({
        where: {
            id: "default-household-despesas-casa"
        },
        update: {
            name: "Despesas de casa",
            createdById: owner.id
        },
        create: {
            id: "default-household-despesas-casa",
            name: "Despesas de casa",
            createdById: owner.id
        }
    });

    await prisma.householdMember.upsert({
        where: {
            householdId_userId: {
                householdId: household.id,
                userId: owner.id
            }
        },
        update: {
            role: "OWNER"
        },
        create: {
            householdId: household.id,
            userId: owner.id,
            role: "OWNER"
        }
    });

    const categories = [
        { name: "Casa", color: "#ef4444", icon: "house", isFixed: true },
        { name: "Comida", color: "#f97316", icon: "utensils", isFixed: false },
        { name: "Transporte", color: "#3b82f6", icon: "car", isFixed: false },
        { name: "Lazer", color: "#8b5cf6", icon: "gamepad-2", isFixed: false },
        { name: "Assinaturas", color: "#06b6d4", icon: "bookmark", isFixed: true },
        { name: "Outros", color: "#6b7280", icon: "circle", isFixed: false },
    ];

    for (const category of categories) {
        await prisma.category.upsert({
            where: {
                householdId_name: {
                    householdId: household.id,
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
                householdId: household.id
            }
        });
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    });
