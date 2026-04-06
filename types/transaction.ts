export type DebtType = "SHARED" | "INDIVIDUAL" | "LOAN";
export type TransactionPaymentKind = "SINGLE" | "FIXED" | "INSTALLMENT";

export interface TransactionListItem {
    id: string;
    description: string;
    amount: number;
    date: Date;
    categoryId: string;
    category: {
        name: string;
        color: string;
    };
    userId: string;
    payerId: string;
    isShared: boolean;
    isPrivate: boolean;
    paymentKind: TransactionPaymentKind;
    installmentGroupId?: string | null;
    installmentNumber?: number | null;
    installmentCount?: number | null;
    installmentTotalAmount?: number | null;
    quoteValues?: unknown;
    debtType: DebtType;
    note?: string | null;
}
