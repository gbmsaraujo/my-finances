import { z } from "zod";

export const createCategorySchema = z.object({
    householdId: z.string().uuid("Space inválido"),
    name: z
        .string()
        .trim()
        .min(2, "Nome da categoria deve ter pelo menos 2 caracteres")
        .max(40, "Nome da categoria deve ter no máximo 40 caracteres"),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
