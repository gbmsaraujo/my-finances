'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    addMonthlyExtraIncome,
    setDefaultMonthlyIncome,
    setMonthlyIncomeForPeriod,
} from '@/app/actions/income';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface MonthlyIncomeCardProps {
    householdId: string;
    month: number;
    year: number;
    salaryMonth: number;
    pendingExpensesTotal: number;
    freeAmount: number;
    hasConfiguredSalary: boolean;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export function MonthlyIncomeCard({
    householdId,
    month,
    year,
    salaryMonth,
    pendingExpensesTotal,
    freeAmount,
    hasConfiguredSalary,
}: MonthlyIncomeCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [savingTarget, setSavingTarget] = useState<
        'month' | 'default' | 'extra' | null
    >(null);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [monthAmount, setMonthAmount] = useState(
        salaryMonth > 0 ? salaryMonth.toString() : '',
    );
    const [defaultAmount, setDefaultAmount] = useState(
        salaryMonth > 0 ? salaryMonth.toString() : '',
    );
    const [extraAmount, setExtraAmount] = useState('');
    const [refreshSnapshot, setRefreshSnapshot] = useState({
        salaryMonth,
        pendingExpensesTotal,
        freeAmount,
    });

    const freeAmountColor = useMemo(() => {
        if (freeAmount > 0) return 'text-emerald-600';
        if (freeAmount < 0) return 'text-red-600';
        return 'text-slate-700';
    }, [freeAmount]);

    const parseAmount = (value: string): number | null => {
        const normalized = value.replace(',', '.').trim();
        if (!normalized) return null;
        const parsed = Number(normalized);
        if (Number.isNaN(parsed) || parsed < 0) return null;
        return parsed;
    };

    const startRefreshWait = () => {
        setRefreshSnapshot({
            salaryMonth,
            pendingExpensesTotal,
            freeAmount,
        });
        setIsRefreshingData(true);
        router.refresh();
    };

    useEffect(() => {
        if (!isRefreshingData) return;

        const changed =
            salaryMonth !== refreshSnapshot.salaryMonth ||
            pendingExpensesTotal !== refreshSnapshot.pendingExpensesTotal ||
            freeAmount !== refreshSnapshot.freeAmount;

        if (changed) {
            setIsRefreshingData(false);
            setSavingTarget(null);
        }
    }, [
        freeAmount,
        isRefreshingData,
        pendingExpensesTotal,
        refreshSnapshot.freeAmount,
        refreshSnapshot.pendingExpensesTotal,
        refreshSnapshot.salaryMonth,
        salaryMonth,
    ]);

    useEffect(() => {
        if (!isRefreshingData) return;

        const timeout = setTimeout(() => {
            setIsRefreshingData(false);
            setSavingTarget(null);
        }, 8000);

        return () => clearTimeout(timeout);
    }, [isRefreshingData]);

    const handleSaveMonthAmount = () => {
        const parsedAmount = parseAmount(monthAmount);
        if (parsedAmount === null) {
            toast.error('Informe um valor mensal válido');
            return;
        }

        setSavingTarget('month');
        startTransition(async () => {
            const result = await setMonthlyIncomeForPeriod({
                householdId,
                month,
                year,
                amount: parsedAmount,
            });

            if (!result.success) {
                toast.error(
                    result.error ?? 'Não foi possível salvar salário do mês',
                );
                setSavingTarget(null);
                return;
            }

            toast.success('Salário do mês salvo com sucesso');
            setMonthAmount('');
            startRefreshWait();
        });
    };

    const handleSaveDefaultAmount = () => {
        const parsedAmount = parseAmount(defaultAmount);
        if (parsedAmount === null) {
            toast.error('Informe um valor recorrente válido');
            return;
        }

        setSavingTarget('default');
        startTransition(async () => {
            const result = await setDefaultMonthlyIncome({
                householdId,
                amount: parsedAmount,
            });

            if (!result.success) {
                toast.error(
                    result.error ??
                        'Não foi possível salvar salário recorrente',
                );
                setSavingTarget(null);
                return;
            }

            toast.success('Salário recorrente salvo com sucesso');
            setDefaultAmount('');
            startRefreshWait();
        });
    };

    const handleAddExtraAmount = () => {
        const parsedAmount = parseAmount(extraAmount);
        if (parsedAmount === null || parsedAmount <= 0) {
            toast.error('Informe uma entrada extra válida');
            return;
        }

        setSavingTarget('extra');
        startTransition(async () => {
            const result = await addMonthlyExtraIncome({
                householdId,
                month,
                year,
                amount: parsedAmount,
            });

            if (!result.success) {
                toast.error(
                    result.error ?? 'Não foi possível adicionar entrada extra',
                );
                setSavingTarget(null);
                return;
            }

            setExtraAmount('');
            toast.success('Entrada extra adicionada com sucesso');
            startRefreshWait();
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className='text-lg'>
                    Seu Salário e Valor Livre
                </CardTitle>
                <CardDescription>
                    Livre = Salário do mês - Gastos pendentes do mês
                </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                    <div className='rounded-lg border p-3'>
                        <p className='text-xs text-slate-500'>Salário do mês</p>
                        <p className='text-lg font-semibold'>
                            {formatCurrency(salaryMonth)}
                        </p>
                    </div>
                    <div className='rounded-lg border p-3'>
                        <p className='text-xs text-slate-500'>
                            Gastos pendentes
                        </p>
                        <p className='text-lg font-semibold'>
                            {formatCurrency(pendingExpensesTotal)}
                        </p>
                    </div>
                    <div className='rounded-lg border p-3'>
                        <p className='text-xs text-slate-500'>Valor livre</p>
                        <p
                            className={`text-lg font-semibold ${freeAmountColor}`}
                        >
                            {formatCurrency(freeAmount)}
                        </p>
                    </div>
                </div>

                {isRefreshingData ? (
                    <div className='flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        <span>Atualizando dados financeiros do mês...</span>
                    </div>
                ) : null}

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                    <div className='space-y-2'>
                        <p className='text-sm font-medium'>
                            Ajustar salário deste mês
                        </p>
                        <div className='flex gap-2'>
                            <Input
                                type='number'
                                min='0'
                                step='0.01'
                                placeholder='Ex: 4500'
                                value={monthAmount}
                                onChange={(e) => setMonthAmount(e.target.value)}
                                disabled={isPending}
                            />
                            <Button
                                type='button'
                                onClick={handleSaveMonthAmount}
                                disabled={isPending}
                            >
                                {savingTarget === 'month' && isPending ? (
                                    <>
                                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar'
                                )}
                            </Button>
                        </div>
                        {savingTarget === 'month' && isPending ? (
                            <p className='text-xs text-slate-500'>
                                Atualizando valores do mês...
                            </p>
                        ) : null}
                    </div>

                    <div className='space-y-2'>
                        <p className='text-sm font-medium'>
                            Definir salário recorrente
                        </p>
                        <div className='flex gap-2'>
                            <Input
                                type='number'
                                min='0'
                                step='0.01'
                                placeholder='Ex: 4500'
                                value={defaultAmount}
                                onChange={(e) =>
                                    setDefaultAmount(e.target.value)
                                }
                                disabled={isPending}
                            />
                            <Button
                                type='button'
                                variant='secondary'
                                onClick={handleSaveDefaultAmount}
                                disabled={isPending}
                            >
                                {savingTarget === 'default' && isPending ? (
                                    <>
                                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar'
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className='space-y-2'>
                        <p className='text-sm font-medium'>Renda Extra</p>
                        <div className='flex gap-2'>
                            <Input
                                type='number'
                                min='0'
                                step='0.01'
                                placeholder='Ex: 800'
                                value={extraAmount}
                                onChange={(e) => setExtraAmount(e.target.value)}
                                disabled={isPending}
                            />
                            <Button
                                type='button'
                                variant='outline'
                                onClick={handleAddExtraAmount}
                                disabled={isPending}
                            >
                                {savingTarget === 'extra' && isPending ? (
                                    <>
                                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                                        Somando...
                                    </>
                                ) : (
                                    'Somar'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {!hasConfiguredSalary ? (
                    <p className='text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2'>
                        Você ainda não configurou salário. Defina um valor para
                        acompanhar seu saldo livre do mês.
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}
