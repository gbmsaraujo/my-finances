import { z } from "zod";

export const debtTypeSchema = z.enum(["SHARED", "INDIVIDUAL", "LOAN"]);
export const paymentKindSchema = z.enum(["SINGLE", "FIXED", "INSTALLMENT"]);

export const createTransactionSchema = z.object({
    description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres").max(100, "Descrição muito longa"),
    amount: z.number().positive("Valor deve ser positivo"),
    date: z.date(),
    categoryId: z.string().uuid("ID da categoria inválido"),
    paymentKind: paymentKindSchema.default("SINGLE"),
    installmentCount: z.number().int().min(2, "A parcela deve ter pelo menos 2 vezes").max(60, "Máximo de 60 parcelas").optional(),
    debtType: debtTypeSchema.default("SHARED"),
    note: z.string().max(200, "Observação muito longa").optional(),
    isPrivate: z.boolean().default(false),
}).superRefine((data, context) => {
    if (data.paymentKind === "INSTALLMENT" && !data.installmentCount) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["installmentCount"],
            message: "Informe o número de parcelas",
        });
    }
});

export const filterTransactionsSchema = z.object({
    month: z.number().min(1).max(12),
    year: z.number().min(2020),
    categoryId: z.string().uuid().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type FilterTransactionsInput = z.infer<typeof filterTransactionsSchema>;
