export type DebtType = "SHARED" | "INDIVIDUAL" | "LOAN";

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
    debtType: DebtType;
    note?: string | null;
}
