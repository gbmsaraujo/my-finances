"use server";

import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth";
import {
    createCategorySchema,
    CreateCategoryInput,
} from "@/lib/validations/category";

interface ActionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export async function createCategory(
    input: CreateCategoryInput,
): Promise<ActionResponse<{ id: string; name: string }>> {
    try {
        const validatedInput = createCategorySchema.parse(input);
        const auth = await requireAuthUser();

        const membership = await prisma.householdMember.findFirst({
            where: {
                householdId: validatedInput.householdId,
                userId: auth.userId,
            },
        });

        if (!membership) {
            return {
                success: false,
                error: "Você não participa deste space",
            };
        }

        const normalizedName = validatedInput.name.replace(/\s+/g, " ").trim();

        const existingCategory = await prisma.category.findFirst({
            where: {
                householdId: validatedInput.householdId,
                name: {
                    equals: normalizedName,
                    mode: "insensitive",
                },
            },
            select: {
                id: true,
                name: true,
            },
        });

        if (existingCategory) {
            return {
                success: false,
                error: "Essa categoria já existe no seu space",
            };
        }

        const category = await prisma.category.create({
            data: {
                householdId: validatedInput.householdId,
                name: normalizedName,
                color: "#6b7280",
                isFixed: false,
            },
            select: {
                id: true,
                name: true,
            },
        });

        return {
            success: true,
            data: category,
        };
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                error: error.issues[0]?.message ?? "Dados inválidos",
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar categoria",
        };
    }
}
