'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    createTransactionSchema,
    CreateTransactionInput,
} from '@/lib/validations/transaction';
import { createTransaction } from '@/app/actions/transactions';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TransactionFormProps {
    categories: Array<{ id: string; name: string; icon?: string }>;
    currentUserId: string;
    partnerUserId?: string;
    partnerName: string;
    onSuccess?: () => void;
}

export function TransactionForm({
    categories,
    currentUserId,
    partnerUserId,
    partnerName,
    onSuccess,
}: TransactionFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const form = useForm<CreateTransactionInput>({
        resolver: zodResolver(createTransactionSchema),
        defaultValues: {
            description: '',
            amount: 0,
            date: new Date(),
            categoryId: categories[0]?.id ?? '',
            payerId: currentUserId,
            debtType: 'SHARED',
            note: '',
            isPrivate: false,
        },
    });

    async function onSubmit(data: CreateTransactionInput) {
        setIsLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            const result = await createTransaction(data);

            if (result.success) {
                setSuccessMessage('Despesa registrada com sucesso!');
                form.reset({
                    description: '',
                    amount: 0,
                    date: new Date(),
                    categoryId: categories[0]?.id ?? '',
                    payerId: currentUserId,
                    debtType: 'SHARED',
                    note: '',
                    isPrivate: false,
                });

                setTimeout(() => {
                    setSuccessMessage('');
                    onSuccess?.();
                }, 2000);
            } else {
                setErrorMessage(result.error || 'Erro ao registrar despesa');
            }
        } catch (error) {
            setErrorMessage('Erro inesperado ao registrar despesa');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    const isPrivate = form.watch('isPrivate');
    const debtType = form.watch('debtType');
    const payerId = form.watch('payerId');

    return (
        <div className='w-full max-w-md mx-auto'>
            {successMessage && (
                <Alert className='mb-4 border-green-500 bg-green-50'>
                    <CheckCircle2 className='h-4 w-4 text-green-600' />
                    <AlertDescription className='text-green-800'>
                        {successMessage}
                    </AlertDescription>
                </Alert>
            )}

            {errorMessage && (
                <Alert
                    variant='destructive'
                    className='mb-4 border-red-500 bg-red-50'
                >
                    <AlertCircle className='h-4 w-4' />
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}

            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className='space-y-6'
                >
                    <FormField
                        control={form.control}
                        name='description'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-base font-semibold'>
                                    Descrição
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder='Ex: Almoço, aluguel, mercado...'
                                        className='h-12 text-lg rounded-lg'
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name='amount'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-base font-semibold'>
                                    Valor
                                </FormLabel>
                                <FormControl>
                                    <div className='relative'>
                                        <span className='absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-600'>
                                            R$
                                        </span>
                                        <Input
                                            type='number'
                                            inputMode='decimal'
                                            placeholder='0.00'
                                            step='0.01'
                                            min='0'
                                            className='h-12 pl-10 pr-4 text-lg rounded-lg font-semibold'
                                            {...field}
                                            onChange={(event) =>
                                                field.onChange(
                                                    parseFloat(
                                                        event.target.value,
                                                    ) || 0,
                                                )
                                            }
                                        />
                                    </div>
                                </FormControl>
                                <FormDescription className='text-xs'>
                                    Campo numérico otimizado para celular
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name='date'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-base font-semibold'>
                                    Data
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type='date'
                                        className='h-12 text-lg rounded-lg'
                                        value={
                                            field.value instanceof Date
                                                ? field.value
                                                      .toISOString()
                                                      .split('T')[0]
                                                : ''
                                        }
                                        onChange={(event) =>
                                            field.onChange(
                                                new Date(event.target.value),
                                            )
                                        }
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name='categoryId'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-base font-semibold'>
                                    Categoria
                                </FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className='h-12 text-base rounded-lg'>
                                            <SelectValue placeholder='Selecione uma categoria' />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {categories.map((category) => (
                                            <SelectItem
                                                key={category.id}
                                                value={category.id}
                                            >
                                                {category.icon
                                                    ? `${category.icon} `
                                                    : ''}
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name='debtType'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-base font-semibold'>
                                    Tipo da dívida
                                </FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className='h-12 text-base rounded-lg'>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value='SHARED'>
                                            Compartilhada
                                        </SelectItem>
                                        <SelectItem value='INDIVIDUAL'>
                                            Individual
                                        </SelectItem>
                                        <SelectItem value='LOAN'>
                                            Empréstimo
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription className='text-xs'>
                                    Compartilhada divide automaticamente 50/50
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name='payerId'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-base font-semibold'>
                                    Quem pagou?
                                </FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className='h-12 text-base rounded-lg'>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value={currentUserId}>
                                            Eu
                                        </SelectItem>
                                        {partnerUserId ? (
                                            <SelectItem value={partnerUserId}>
                                                {partnerName}
                                            </SelectItem>
                                        ) : null}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name='note'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-base font-semibold'>
                                    Observação (opcional)
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder='Ex: Julinho usou meu cartão'
                                        className='h-12 text-sm rounded-lg'
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription className='text-xs'>
                                    Útil para explicar empréstimos e gastos fora
                                    do padrão
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name='isPrivate'
                        render={({ field }) => (
                            <FormItem className='flex items-center justify-between rounded-lg border border-gray-200 p-4 bg-gray-50'>
                                <div className='space-y-0.5'>
                                    <FormLabel className='text-base font-semibold cursor-pointer'>
                                        Despesa Privada
                                    </FormLabel>
                                    <FormDescription className='text-xs'>
                                        {isPrivate
                                            ? 'Somente você verá essa despesa'
                                            : 'O casal pode visualizar essa despesa'}
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            if (
                                                checked &&
                                                form.getValues('debtType') ===
                                                    'SHARED'
                                            ) {
                                                form.setValue(
                                                    'debtType',
                                                    'INDIVIDUAL',
                                                );
                                            }
                                        }}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    {debtType === 'SHARED' ? (
                        <Alert className='border-blue-500 bg-blue-50'>
                            <AlertCircle className='h-4 w-4 text-blue-600' />
                            <AlertDescription className='text-blue-800 text-sm'>
                                A despesa será dividida automaticamente entre
                                vocês.
                            </AlertDescription>
                        </Alert>
                    ) : null}

                    {debtType === 'LOAN' && payerId !== currentUserId ? (
                        <Alert className='border-amber-500 bg-amber-50'>
                            <AlertCircle className='h-4 w-4 text-amber-600' />
                            <AlertDescription className='text-amber-800 text-sm'>
                                Você está registrando um empréstimo pago por{' '}
                                {partnerName}.
                            </AlertDescription>
                        </Alert>
                    ) : null}

                    <Button
                        type='submit'
                        disabled={isLoading || !form.formState.isValid}
                        className='w-full h-14 text-lg font-semibold rounded-lg'
                        size='lg'
                    >
                        {isLoading ? 'Registrando...' : 'Registrar Despesa'}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
