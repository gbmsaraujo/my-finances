'use client';

import { useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Lock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Transaction {
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
    debtType: 'SHARED' | 'INDIVIDUAL' | 'LOAN';
    note?: string | null;
}

interface TransactionsListProps {
    transactions: Transaction[];
    currentUserId: string;
    categories: Array<{ id: string; name: string; icon?: string }>;
    isLoading?: boolean;
    onCategoryChange?: (categoryId: string) => void;
}

export function TransactionsList({
    transactions,
    currentUserId,
    categories,
    isLoading = false,
    onCategoryChange,
}: TransactionsListProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategory(categoryId);
        onCategoryChange?.(categoryId);
    };

    const filteredTransactions =
        selectedCategory === 'all'
            ? transactions
            : transactions.filter((t) => t.categoryId === selectedCategory);

    const isYourTransaction = (t: Transaction) => t.userId === currentUserId;
    const youPaid = (t: Transaction) => t.payerId === currentUserId;

    if (isLoading) {
        return (
            <Card>
                <CardContent className='pt-6'>
                    <div className='space-y-3'>
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className='h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse'
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (transactions.length === 0) {
        return (
            <Card>
                <CardContent className='pt-12 pb-12 text-center'>
                    <div className='text-4xl mb-3'>📊</div>
                    <p className='text-gray-600 dark:text-gray-400 font-medium'>
                        Nenhuma despesa registrada ainda
                    </p>
                    <p className='text-sm text-gray-500 dark:text-gray-500 mt-2'>
                        Comece a adicionar gastos para ver o resumo do mês
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className='flex flex-col gap-4'>
                    <div>
                        <CardTitle>Histórico de Transações</CardTitle>
                        <CardDescription>Gastos do mês</CardDescription>
                    </div>

                    {/* Filtro de Categoria */}
                    <div className='flex gap-2'>
                        <Select
                            value={selectedCategory}
                            onValueChange={handleCategoryChange}
                        >
                            <SelectTrigger className='h-10 text-sm'>
                                <SelectValue placeholder='Todas as categorias' />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='all'>
                                    Todas as categorias
                                </SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.icon && (
                                            <span className='mr-2'>
                                                {cat.icon}
                                            </span>
                                        )}
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div className='space-y-3'>
                    {filteredTransactions.length === 0 ? (
                        <p className='text-center text-gray-500 dark:text-gray-400 py-4'>
                            Nenhuma transação nesta categoria
                        </p>
                    ) : (
                        filteredTransactions.map((transaction) => (
                            <TransactionItem
                                key={transaction.id}
                                transaction={transaction}
                                isYourTransaction={isYourTransaction(
                                    transaction,
                                )}
                                youPaid={youPaid(transaction)}
                            />
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

interface TransactionItemProps {
    transaction: Transaction;
    isYourTransaction: boolean;
    youPaid: boolean;
}

function TransactionItem({
    transaction,
    isYourTransaction,
    youPaid,
}: TransactionItemProps) {
    const date = new Date(transaction.date);
    const formattedDate = date.toLocaleDateString('pt-BR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const debtLabel =
        transaction.debtType === 'SHARED'
            ? 'Compartilhada'
            : transaction.debtType === 'LOAN'
              ? 'Empréstimo'
              : 'Individual';

    return (
        <div className='flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-gray-100 dark:border-gray-700'>
            {/* Icon/Category */}
            <div
                className='w-12 h-12 rounded-lg flex items-center justify-center text-lg font-semibold text-white flex-shrink-0'
                style={{ backgroundColor: transaction.category.color }}
            >
                {}
            </div>

            {/* Details */}
            <div className='flex-1 min-w-0'>
                <div className='flex items-start justify-between gap-2 mb-1'>
                    <div className='min-w-0 flex-1'>
                        <p className='font-medium text-gray-900 dark:text-white truncate'>
                            {transaction.description}
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                            {formattedDate}
                        </p>
                    </div>

                    {/* Badges */}
                    <div className='flex gap-1 flex-shrink-0'>
                        {transaction.isPrivate && (
                            <Badge
                                variant='secondary'
                                className='gap-1 text-xs'
                            >
                                <Lock className='h-3 w-3' />
                            </Badge>
                        )}
                        {!youPaid && isYourTransaction && (
                            <Badge variant='outline' className='text-xs'>
                                Depois paga
                            </Badge>
                        )}
                        {youPaid && !isYourTransaction && (
                            <Badge variant='outline' className='text-xs'>
                                Você pagou
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Category */}
                <p className='text-xs text-gray-600 dark:text-gray-400'>
                    {transaction.category.name} • {debtLabel}
                    {transaction.isShared && ' (50%)'}
                </p>
                {transaction.note ? (
                    <p className='text-xs text-indigo-700 mt-1 truncate'>
                        {transaction.note}
                    </p>
                ) : null}
            </div>

            {/* Amount */}
            <div className='text-right flex-shrink-0'>
                <p
                    className={`text-lg font-bold ${
                        isYourTransaction
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-900 dark:text-white'
                    }`}
                >
                    {isYourTransaction ? (
                        <ArrowDownLeft className='inline h-4 w-4 mr-1 align-text-bottom' />
                    ) : (
                        <ArrowUpRight className='inline h-4 w-4 mr-1 align-text-bottom text-green-600 dark:text-green-400' />
                    )}
                    R$ {transaction.amount.toFixed(2)}
                </p>
            </div>
        </div>
    );
}
