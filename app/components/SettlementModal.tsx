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
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';

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

interface Participant {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface SettlementModalProps {
    isOpen: boolean;
    transaction?: Transaction;
    participants: Participant[];
    onCancel: () => void;
    onConfirm: (payerId: string) => Promise<void>;
    isLoading?: boolean;
}

export function SettlementModal({
    isOpen,
    transaction,
    participants,
    onCancel,
    onConfirm,
    isLoading = false,
}: SettlementModalProps) {
    const [selectedPayerId, setSelectedPayerId] = useState<string>('');

    if (!isOpen || !transaction) {
        return null;
    }

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

    const formattedAmount = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(transaction.amount);

    const handleConfirm = async () => {
        if (!selectedPayerId) return;
        await onConfirm(selectedPayerId);
        setSelectedPayerId('');
    };

    const handleCancel = () => {
        setSelectedPayerId('');
        onCancel();
    };

    // Overlay
    return (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
            <Card className='w-full max-w-md'>
                <CardHeader>
                    <CardTitle>Confirmar Pagamento</CardTitle>
                    <CardDescription>
                        Quem realmente pagou por esta despesa?
                    </CardDescription>
                </CardHeader>

                <CardContent className='space-y-6'>
                    {/* Transaction Details */}
                    <div className='space-y-3 p-3 bg-gray-50 rounded-lg'>
                        <div className='flex items-start gap-3'>
                            <div
                                className='w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold text-white flex-shrink-0'
                                style={{
                                    backgroundColor: transaction.category.color,
                                }}
                            >
                                {}
                            </div>
                            <div className='flex-1 min-w-0'>
                                <p className='font-medium text-gray-900 truncate'>
                                    {transaction.description}
                                </p>
                                <p className='text-xs text-gray-600 mt-1'>
                                    {transaction.category.name} • {debtLabel}
                                    {transaction.isShared && ' (50%)'}
                                </p>
                            </div>
                        </div>

                        <div className='flex items-center justify-between pt-2 border-t border-gray-200'>
                            <span className='text-sm text-gray-600'>
                                {formattedDate}
                            </span>
                            <span className='text-lg font-bold text-gray-900'>
                                {formattedAmount}
                            </span>
                        </div>

                        {transaction.isPrivate && (
                            <div className='flex items-center gap-1 text-xs text-gray-600'>
                                <Lock className='h-3 w-3' />
                                <span>Despesa Privada</span>
                            </div>
                        )}

                        {transaction.note && (
                            <p className='text-xs text-indigo-700 pt-2'>
                                {transaction.note}
                            </p>
                        )}
                    </div>

                    {/* Payer Selection */}
                    <div className='space-y-2'>
                        <label className='text-sm font-medium text-gray-900'>
                            Quem pagou?
                        </label>
                        <Select
                            value={selectedPayerId}
                            onValueChange={setSelectedPayerId}
                        >
                            <SelectTrigger className='h-10'>
                                <SelectValue placeholder='Selecione quem pagou' />
                            </SelectTrigger>
                            <SelectContent>
                                {participants.map((participant) => (
                                    <SelectItem
                                        key={participant.id}
                                        value={participant.id}
                                    >
                                        {participant.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Action Buttons */}
                    <div className='grid grid-cols-2 gap-2 pt-4'>
                        <Button
                            variant='outline'
                            onClick={handleCancel}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isLoading || !selectedPayerId}
                            className='bg-indigo-600 hover:bg-indigo-700'
                        >
                            {isLoading ? 'Confirmando...' : 'Confirmar'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
