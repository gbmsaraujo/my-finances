'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    createTransactionSchema,
    CreateTransactionInput,
} from '@/lib/validations/transaction';
import { createTransaction } from '@/app/actions/transactions';
import { createCategory } from '@/app/actions/category';
import { buildInstallmentSchedule } from '@/lib/installments';
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
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TransactionFormProps {
    householdId: string;
    categories: Array<{ id: string; name: string }>;
    currentUserId: string;
    participants: Array<{ id: string; name: string }>;
    partnerUserId?: string;
    partnerName: string;
    onSuccess?: () => void;
}

function formatCurrencyFromDigits(digits: string): string {
    const numericValue = Number(digits) / 100;
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numericValue);
}

function toInputDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function fromInputDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function TransactionForm({
    householdId,
    categories,
    currentUserId,
    participants,
    partnerUserId,
    partnerName,
    onSuccess,
}: TransactionFormProps) {
    const [localCategories, setLocalCategories] = useState(categories);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [showCreateCategory, setShowCreateCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [amountInput, setAmountInput] = useState('');

    const defaultCategoryId = categories[0]?.id ?? '';

    useEffect(() => {
        setLocalCategories(categories);
    }, [categories]);

    const form = useForm<CreateTransactionInput>({
        resolver: zodResolver(createTransactionSchema),
        defaultValues: {
            description: '',
            amount: 0,
            date: new Date(),
            categoryId: defaultCategoryId,
            paymentKind: 'SINGLE',
            installmentCount: undefined,
            debtType: 'SHARED',
            note: '',
            isPrivate: false,
        },
    });

    useEffect(() => {
        const selectedCategory = form.getValues('categoryId');
        if (
            !localCategories.some(
                (category) => category.id === selectedCategory,
            )
        ) {
            form.setValue('categoryId', localCategories[0]?.id ?? '', {
                shouldDirty: false,
                shouldValidate: true,
            });
        }
    }, [form, localCategories]);

    async function onSubmit(data: CreateTransactionInput) {
        setIsLoading(true);

        try {
            const result = await createTransaction(data);

            if (result.success) {
                toast.success('Despesa registrada com sucesso!');
                form.reset({
                    description: '',
                    amount: 0,
                    date: new Date(),
                    categoryId: localCategories[0]?.id ?? '',
                    paymentKind: 'SINGLE',
                    installmentCount: undefined,
                    debtType: 'SHARED',
                    note: '',
                    isPrivate: false,
                });
                setAmountInput('');

                onSuccess?.();
            } else {
                toast.error(result.error || 'Erro ao registrar despesa');
            }
        } catch (error) {
            toast.error('Erro inesperado ao registrar despesa');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCreateCategory() {
        const categoryName = newCategoryName.trim();
        if (!categoryName) {
            toast.error('Informe o nome da nova categoria');
            return;
        }

        setIsCreatingCategory(true);

        try {
            const result = await createCategory({
                householdId,
                name: categoryName,
            });

            if (!result.success || !result.data) {
                toast.error(result.error ?? 'Erro ao criar categoria');
                return;
            }

            const updatedCategories = [...localCategories, result.data].sort(
                (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
            );

            setLocalCategories(updatedCategories);
            form.setValue('categoryId', result.data.id, {
                shouldValidate: true,
                shouldDirty: true,
            });
            setNewCategoryName('');
            setShowCreateCategory(false);
            toast.success(`Categoria "${result.data.name}" criada`);
        } catch (error) {
            toast.error('Erro inesperado ao criar categoria');
            console.error(error);
        } finally {
            setIsCreatingCategory(false);
        }
    }

    const isPrivate = form.watch('isPrivate');
    const paymentKind = form.watch('paymentKind');
    const installmentCount = form.watch('installmentCount');
    const amountValue = form.watch('amount');
    const dateValue = form.watch('date');
    const debtType = form.watch('debtType');
    const categoryId = form.watch('categoryId');
    const selectedCategoryName =
        localCategories.find((category) => category.id === categoryId)?.name ??
        'Selecione uma categoria';

    const amountLabel =
        paymentKind === 'INSTALLMENT'
            ? 'Valor total'
            : paymentKind === 'FIXED'
              ? 'Valor mensal'
              : 'Valor';

    const installmentPreview =
        paymentKind === 'INSTALLMENT' && installmentCount && amountValue > 0
            ? buildInstallmentSchedule({
                  totalAmount: amountValue,
                  installmentCount,
                  firstDueDate:
                      dateValue instanceof Date ? dateValue : new Date(),
              })
            : [];

    const debtTypeLabelMap: Record<CreateTransactionInput['debtType'], string> =
        {
            SHARED: 'Compartilhada',
            INDIVIDUAL: 'Individual',
            LOAN: 'Empréstimo',
        };
    const selectedDebtTypeLabel =
        debtTypeLabelMap[debtType] ?? 'Selecione o tipo';

    return (
        <div className='w-full max-w-md mx-auto'>
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
                                    {amountLabel}
                                </FormLabel>
                                <FormControl>
                                    <div className='relative'>
                                        <span className='absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-600'>
                                            R$
                                        </span>
                                        <Input
                                            type='text'
                                            inputMode='numeric'
                                            placeholder='0,00'
                                            className='h-12 pl-10 pr-4 text-lg rounded-lg font-semibold'
                                            value={amountInput}
                                            onChange={(event) => {
                                                const digits =
                                                    event.target.value.replace(
                                                        /\D/g,
                                                        '',
                                                    );

                                                if (!digits) {
                                                    setAmountInput('');
                                                    field.onChange(0);
                                                    return;
                                                }

                                                setAmountInput(
                                                    formatCurrencyFromDigits(
                                                        digits,
                                                    ),
                                                );
                                                field.onChange(
                                                    Number(digits) / 100,
                                                );
                                            }}
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
                        name='paymentKind'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-base font-semibold'>
                                    Tipo de despesa
                                </FormLabel>
                                <Select
                                    onValueChange={(value) => {
                                        field.onChange(value);
                                        if (value !== 'INSTALLMENT') {
                                            form.setValue(
                                                'installmentCount',
                                                undefined,
                                            );
                                        }
                                    }}
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className='h-12 text-base rounded-lg'>
                                            <SelectValue placeholder='Selecione o tipo'>
                                                {field.value === 'SINGLE'
                                                    ? 'Única'
                                                    : field.value === 'FIXED'
                                                      ? 'Fixa'
                                                      : 'Parcelada'}
                                            </SelectValue>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value='SINGLE'>
                                            Única
                                        </SelectItem>
                                        <SelectItem value='FIXED'>
                                            Fixa
                                        </SelectItem>
                                        <SelectItem value='INSTALLMENT'>
                                            Parcelada
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription className='text-xs'>
                                    Única é um lançamento só; fixa aparece como
                                    conta recorrente; parcelada gera parcelas
                                    mensais.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {paymentKind === 'INSTALLMENT' ? (
                        <FormField
                            control={form.control}
                            name='installmentCount'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className='text-base font-semibold'>
                                        Número de parcelas
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type='number'
                                            min={2}
                                            max={60}
                                            placeholder='Ex: 4'
                                            className='h-12 text-lg rounded-lg'
                                            value={field.value ?? ''}
                                            onChange={(event) =>
                                                field.onChange(
                                                    event.target.value
                                                        ? Number(
                                                              event.target
                                                                  .value,
                                                          )
                                                        : undefined,
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormDescription className='text-xs'>
                                        Exemplo: 4x em maio, junho, julho e
                                        agosto.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ) : null}

                    {installmentPreview.length > 0 ? (
                        <div className='rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900 space-y-2'>
                            <p className='font-semibold'>
                                Preview das parcelas
                            </p>
                            <p className='text-xs text-indigo-700'>
                                A despesa vai aparecer nos meses abaixo até a
                                última parcela ser paga.
                            </p>
                            <div className='space-y-1'>
                                {installmentPreview.map((item) => (
                                    <div
                                        key={item.installmentNumber}
                                        className='flex items-center justify-between gap-3'
                                    >
                                        <span>
                                            {new Intl.DateTimeFormat('pt-BR', {
                                                month: 'long',
                                                year: 'numeric',
                                            }).format(item.dueDate)}
                                        </span>
                                        <span className='font-medium'>
                                            R$ {item.amount.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

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
                                                ? toInputDate(field.value)
                                                : ''
                                        }
                                        onChange={(event) =>
                                            field.onChange(
                                                fromInputDate(
                                                    event.target.value,
                                                ),
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
                                            <SelectValue placeholder='Selecione uma categoria'>
                                                {selectedCategoryName}
                                            </SelectValue>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {localCategories.map((category) => (
                                            <SelectItem
                                                key={category.id}
                                                value={category.id}
                                            >
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {showCreateCategory ? (
                                    <div className='mt-3 flex items-center gap-2'>
                                        <Input
                                            value={newCategoryName}
                                            onChange={(event) =>
                                                setNewCategoryName(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder='Ex: Educação, Pets...'
                                            className='h-10'
                                        />
                                        <Button
                                            type='button'
                                            onClick={handleCreateCategory}
                                            disabled={isCreatingCategory}
                                            variant='secondary'
                                        >
                                            {isCreatingCategory
                                                ? 'Criando...'
                                                : 'Salvar'}
                                        </Button>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            onClick={() => {
                                                setShowCreateCategory(false);
                                                setNewCategoryName('');
                                            }}
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        type='button'
                                        variant='outline'
                                        className='mt-2 h-10'
                                        onClick={() =>
                                            setShowCreateCategory(true)
                                        }
                                    >
                                        + Adicionar nova categoria
                                    </Button>
                                )}
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
                                            <SelectValue placeholder='Selecione o tipo'>
                                                {selectedDebtTypeLabel}
                                            </SelectValue>
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
