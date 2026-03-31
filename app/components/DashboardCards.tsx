'use client';

import { useState, useEffect } from 'react';
import { SettlementDetails } from '@/lib/calculations';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingDown, TrendingUp, Scale } from 'lucide-react';

interface SettlementCardProps {
    settlement: SettlementDetails | null;
    isLoading?: boolean;
    partnerName: string;
    onSettleClick?: () => void;
}

export function SettlementCard({
    settlement,
    isLoading = false,
    partnerName,
    onSettleClick,
}: SettlementCardProps) {
    if (isLoading || !settlement) {
        return (
            <Card className='bg-gradient-to-br from-indigo-500 to-purple-600 border-0 text-white'>
                <CardHeader>
                    <CardTitle>Carregando...</CardTitle>
                </CardHeader>
            </Card>
        );
    }

    const isSettled = settlement.balance === 0;
    const userOwesMoney = settlement.balance < 0;
    const absBalance = Math.abs(settlement.balance);

    return (
        <Card
            className={`border-0 text-white overflow-hidden transition-all ${
                isSettled
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                    : userOwesMoney
                      ? 'bg-gradient-to-br from-orange-500 to-red-600'
                      : 'bg-gradient-to-br from-indigo-500 to-purple-600'
            }`}
        >
            <CardHeader className='pb-3'>
                <CardTitle className='flex items-center gap-2 text-lg'>
                    {isSettled ? (
                        <Scale className='h-5 w-5' />
                    ) : userOwesMoney ? (
                        <TrendingDown className='h-5 w-5' />
                    ) : (
                        <TrendingUp className='h-5 w-5' />
                    )}
                    Saldo do Mês
                </CardTitle>
            </CardHeader>

            <CardContent className='space-y-4'>
                {/* Valor Principal */}
                <div className='space-y-1'>
                    <p className='text-sm font-semibold opacity-90'>
                        {isSettled
                            ? '🎉 Estão Quites!'
                            : userOwesMoney
                              ? 'Você deve'
                              : `${partnerName} deve`}
                    </p>
                    <p className='text-4xl font-bold'>
                        {isSettled ? 'R$ 0.00' : `R$ ${absBalance.toFixed(2)}`}
                    </p>
                </div>

                {/* Descrição */}
                <p className='text-sm opacity-90 leading-relaxed'>
                    {settlement.description}
                </p>

                {/* Botão de Ação */}
                {!isSettled && onSettleClick && (
                    <Button
                        onClick={onSettleClick}
                        variant='secondary'
                        className='w-full mt-4 font-semibold'
                    >
                        {userOwesMoney ? 'Pagar Débito' : 'Receber'}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

interface SpendingSummaryProps {
    yourSpent: number;
    partnerSpent: number;
    partnerName: string;
    isLoading?: boolean;
}

export function SpendingSummary({
    yourSpent,
    partnerSpent,
    partnerName,
    isLoading = false,
}: SpendingSummaryProps) {
    const total = yourSpent + partnerSpent;

    return (
        <div className='grid grid-cols-2 gap-4'>
            {/* Seu Gasto */}
            <Card className='bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-blue-200 dark:border-blue-700'>
                <CardContent className='pt-6'>
                    <div className='text-center space-y-2'>
                        <p className='text-sm font-semibold text-gray-700 dark:text-gray-300'>
                            Seus Gastos
                        </p>
                        <p className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
                            R$ {yourSpent.toFixed(2)}
                        </p>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>
                            {total > 0
                                ? `${((yourSpent / total) * 100).toFixed(0)}% do total`
                                : '0%'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Gasto do Parceiro */}
            <Card className='bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 border-purple-200 dark:border-purple-700'>
                <CardContent className='pt-6'>
                    <div className='text-center space-y-2'>
                        <p className='text-sm font-semibold text-gray-700 dark:text-gray-300'>
                            Gastos de {partnerName}
                        </p>
                        <p className='text-2xl font-bold text-purple-600 dark:text-purple-400'>
                            R$ {partnerSpent.toFixed(2)}
                        </p>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>
                            {total > 0
                                ? `${((partnerSpent / total) * 100).toFixed(0)}% do total`
                                : '0%'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

interface CategoryBreakdownProps {
    categories: Array<{
        name: string;
        total: number;
        color: string;
        icon?: string;
    }>;
    isLoading?: boolean;
}

export function CategoryBreakdown({
    categories,
    isLoading = false,
}: CategoryBreakdownProps) {
    const total = categories.reduce((sum, cat) => sum + cat.total, 0);

    if (categories.length === 0) {
        return (
            <Card>
                <CardContent className='pt-6 text-center text-gray-500 dark:text-gray-400'>
                    Nenhuma despesa registrada ainda
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className='text-lg'>Gastos por Categoria</CardTitle>
                <CardDescription>Composição do mês</CardDescription>
            </CardHeader>

            <CardContent className='space-y-3'>
                {categories.map((category, idx) => {
                    const percentage =
                        total > 0 ? (category.total / total) * 100 : 0;

                    return (
                        <div key={idx} className='space-y-1'>
                            <div className='flex items-center justify-between'>
                                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                    {category.icon && (
                                        <span className='mr-2'>
                                            {category.icon}
                                        </span>
                                    )}
                                    {category.name}
                                </span>
                                <span className='text-sm font-semibold text-gray-900 dark:text-white'>
                                    R$ {category.total.toFixed(2)}
                                </span>
                            </div>
                            <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                                <div
                                    className='h-2 rounded-full transition-all duration-300'
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: category.color,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
