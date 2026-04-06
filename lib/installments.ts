export type InstallmentQuote = {
    installmentNumber: number;
    dueDate: Date;
    amount: number;
};

function addMonthsSafely(baseDate: Date, monthsToAdd: number) {
    const date = new Date(baseDate);
    const dayOfMonth = date.getDate();

    date.setMonth(date.getMonth() + monthsToAdd + 1, 0);

    const lastDayOfTargetMonth = date.getDate();
    date.setDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
    date.setHours(12, 0, 0, 0);

    return date;
}

function roundToCents(value: number) {
    return Math.round(value * 100) / 100;
}

export function buildInstallmentSchedule(params: {
    totalAmount: number;
    installmentCount: number;
    firstDueDate: Date;
}): InstallmentQuote[] {
    const totalInCents = Math.round(params.totalAmount * 100);
    const baseAmount = Math.floor(totalInCents / params.installmentCount);
    const remainder = totalInCents % params.installmentCount;

    return Array.from({ length: params.installmentCount }, (_, index) => {
        const cents = baseAmount + (index < remainder ? 1 : 0);
        return {
            installmentNumber: index + 1,
            dueDate: addMonthsSafely(params.firstDueDate, index),
            amount: roundToCents(cents / 100),
        };
    });
}

export function buildMonthlyRecurringSchedule(params: {
    amount: number;
    firstDueDate: Date;
    months?: number;
}): InstallmentQuote[] {
    const monthsToCreate = params.months ?? 120;

    return Array.from({ length: monthsToCreate }, (_, index) => ({
        installmentNumber: index + 1,
        dueDate: addMonthsSafely(params.firstDueDate, index),
        amount: roundToCents(params.amount),
    }));
}
