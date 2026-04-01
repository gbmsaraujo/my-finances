import { z } from 'zod';

export const monthlyIncomeSchema = z.object({
    householdId: z.string().uuid('ID do space inválido'),
    amount: z.number().min(0, 'Salário não pode ser negativo'),
});

export const monthlyIncomeOverrideSchema = monthlyIncomeSchema.extend({
    month: z.number().min(1).max(12),
    year: z.number().min(2020),
});

export type MonthlyIncomeInput = z.infer<typeof monthlyIncomeSchema>;
export type MonthlyIncomeOverrideInput = z.infer<
    typeof monthlyIncomeOverrideSchema
>;
