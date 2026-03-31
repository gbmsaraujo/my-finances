import { z } from "zod";

export const debtTypeSchema = z.enum(["SHARED", "INDIVIDUAL", "LOAN"]);

export const createTransactionSchema = z.object({
    description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres").max(100, "Descrição muito longa"),
    amount: z.number().positive("Valor deve ser positivo"),
    date: z.date(),
    categoryId: z.string().uuid("ID da categoria inválido"),
    payerId: z.string().uuid("ID do pagador inválido"),
    debtType: debtTypeSchema.default("SHARED"),
    note: z.string().max(200, "Observação muito longa").optional(),
    isPrivate: z.boolean().default(false),
});

export const filterTransactionsSchema = z.object({
    month: z.number().min(1).max(12),
    year: z.number().min(2020),
    categoryId: z.string().uuid().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type FilterTransactionsInput = z.infer<typeof filterTransactionsSchema>;
