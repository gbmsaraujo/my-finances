'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { toast } from 'sonner';
import { toggleTransactionPaymentStatus } from '@/app/actions/transactions';

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
    paymentStatus: 'PENDING' | 'PAID';
    note?: string | null;
}

interface TransactionsListProps {
    transactions: Transaction[];
    currentUserId: string;
    householdId: string;
    selectedMonth: number;
    selectedYear: number;
    categories: Array<{ id: string; name: string }>;
    isLoading?: boolean;
    onCategoryChange?: (categoryId: string) => void;
}

export function TransactionsList({
    transactions,
    currentUserId,
    householdId,
    selectedMonth,
    selectedYear,
    categories,
    isLoading = false,
    onCategoryChange,
}: TransactionsListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isChangingPeriod, startTransition] = useTransition();
    const [localTransactions, setLocalTransactions] = useState(transactions);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<
        'all' | 'PENDING' | 'PAID'
    >('all');
    const [updatingTransactionId, setUpdatingTransactionId] = useState<
        string | null
    >(null);

    useEffect(() => {
        setLocalTransactions(transactions);
    }, [transactions]);

    const monthOptions = [
        { value: 1, label: 'Janeiro' },
        { value: 2, label: 'Fevereiro' },
        { value: 3, label: 'Março' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Maio' },
        { value: 6, label: 'Junho' },
        { value: 7, label: 'Julho' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Setembro' },
        { value: 10, label: 'Outubro' },
        { value: 11, label: 'Novembro' },
        { value: 12, label: 'Dezembro' },
    ];

    const yearOptions = Array.from({ length: 5 }, (_, index) => {
        const base = new Date().getFullYear() - 2;
        const year = base + index;
        return { value: year, label: String(year) };
    });

    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategory(categoryId);
        onCategoryChange?.(categoryId);
    };

    const updateMonthYear = (month: number, year: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('month', String(month));
        params.set('year', String(year));
        params.set('spaceId', householdId);
        startTransition(() => {
            router.push(`/dashboard?${params.toString()}`);
        });
    };

    const handleMonthChange = (month: string) => {
        updateMonthYear(Number(month), selectedYear);
    };

    const handleYearChange = (year: string) => {
        updateMonthYear(selectedMonth, Number(year));
    };

    const handleToggleStatus = async (transaction: Transaction) => {
        const nextStatus =
            transaction.paymentStatus === 'PAID' ? 'PENDING' : 'PAID';
        setUpdatingTransactionId(transaction.id);

        const result = await toggleTransactionPaymentStatus(
            transaction.id,
            nextStatus,
        );
        if (!result.success || !result.data) {
            toast.error(result.error ?? 'Não foi possível atualizar o status');
            setUpdatingTransactionId(null);
            return;
        }

        setLocalTransactions((current) =>
            current.map((item) =>
                item.id === transaction.id
                    ? { ...item, paymentStatus: result.data!.paymentStatus }
                    : item,
            ),
        );
        toast.success(
            nextStatus === 'PAID'
                ? 'Despesa marcada como paga'
                : 'Despesa marcada como pendente',
        );
        setUpdatingTransactionId(null);
    };

    const filteredTransactions =
        selectedCategory === 'all'
            ? localTransactions
            : localTransactions.filter(
                  (t) => t.categoryId === selectedCategory,
              );

    const statusFilteredTransactions =
        selectedStatus === 'all'
            ? filteredTransactions
            : filteredTransactions.filter(
                  (t) => t.paymentStatus === selectedStatus,
              );

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

    if (localTransactions.length === 0) {
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
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                        <Select
                            value={String(selectedMonth)}
                            onValueChange={handleMonthChange}
                            disabled={isChangingPeriod}
                        >
                            <SelectTrigger className='h-10 text-sm'>
                                <SelectValue placeholder='Mês' />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map((month) => (
                                    <SelectItem
                                        key={month.value}
                                        value={String(month.value)}
                                    >
                                        {month.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={String(selectedYear)}
                            onValueChange={handleYearChange}
                            disabled={isChangingPeriod}
                        >
                            <SelectTrigger className='h-10 text-sm'>
                                <SelectValue placeholder='Ano' />
                            </SelectTrigger>
                            <SelectContent>
                                {yearOptions.map((year) => (
                                    <SelectItem
                                        key={year.value}
                                        value={String(year.value)}
                                    >
                                        {year.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedCategory}
                            onValueChange={handleCategoryChange}
                            disabled={isChangingPeriod}
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
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedStatus}
                            onValueChange={(
                                value: 'all' | 'PENDING' | 'PAID',
                            ) => setSelectedStatus(value)}
                            disabled={isChangingPeriod}
                        >
                            <SelectTrigger className='h-10 text-sm'>
                                <SelectValue placeholder='Status' />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='all'>
                                    Todos os status
                                </SelectItem>
                                <SelectItem value='PENDING'>
                                    Pendentes
                                </SelectItem>
                                <SelectItem value='PAID'>Pagas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {isChangingPeriod ? (
                        <p className='text-xs text-slate-500'>
                            Carregando despesas do período selecionado...
                        </p>
                    ) : null}
                </div>
            </CardHeader>

            <CardContent>
                <div className='space-y-3'>
                    {statusFilteredTransactions.length === 0 ? (
                        <p className='text-center text-gray-500 dark:text-gray-400 py-4'>
                            Nenhuma transação para os filtros selecionados
                        </p>
                    ) : (
                        statusFilteredTransactions.map((transaction) => (
                            <TransactionItem
                                key={transaction.id}
                                transaction={transaction}
                                isYourTransaction={isYourTransaction(
                                    transaction,
                                )}
                                youPaid={youPaid(transaction)}
                                isUpdating={
                                    updatingTransactionId === transaction.id
                                }
                                onToggleStatus={() =>
                                    handleToggleStatus(transaction)
                                }
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
    isUpdating: boolean;
    onToggleStatus: () => void;
}

function TransactionItem({
    transaction,
    isYourTransaction,
    youPaid,
    isUpdating,
    onToggleStatus,
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
                        <Badge
                            variant={
                                transaction.paymentStatus === 'PAID'
                                    ? 'default'
                                    : 'outline'
                            }
                            className='text-xs'
                        >
                            {transaction.paymentStatus === 'PAID'
                                ? 'Pago'
                                : 'Pendente'}
                        </Badge>
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

                <div className='mt-2'>
                    <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        disabled={isUpdating}
                        onClick={onToggleStatus}
                    >
                        {isUpdating
                            ? 'Atualizando...'
                            : transaction.paymentStatus === 'PAID'
                              ? 'Voltar para pendente'
                              : 'Marcar como pago'}
                    </Button>
                </div>
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
