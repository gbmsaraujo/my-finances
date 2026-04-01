import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingNavButton } from '@/app/components/LoadingNavButton';
import {
    SettlementCard,
    SpendingSummary,
    CategoryBreakdown,
} from '@/app/components/DashboardCards';
import { MonthlyIncomeCard } from '@/app/components/MonthlyIncomeCard';
import { TransactionsList } from '@/app/components/TransactionsList';
import {
    CategoryDonutChart,
    DailyTrendChart,
} from '@/app/components/SpendingCharts';
import { calculateSettlement, getSettlementDetails } from '@/lib/calculations';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';
import { getHouseholdContext } from '@/lib/household';
import { ensureUserHousehold } from '@/app/actions/household';
import { getMonthlyIncomeSummary } from '@/app/actions/income';
import { parseTransactionStatus } from '@/lib/transaction-status';

interface DashboardPageProps {
    searchParams?: Promise<{ spaceId?: string; month?: string; year?: string }>;
}

export default async function DashboardPage({
    searchParams,
}: DashboardPageProps) {
    const auth = await requireAuthUser();
    await ensureUserHousehold(auth.userId);
    const params = searchParams ? await searchParams : undefined;
    const now = new Date();
    const selectedMonth = Math.min(
        12,
        Math.max(
            1,
            Number(params?.month ?? now.getMonth() + 1) || now.getMonth() + 1,
        ),
    );
    const selectedYear =
        Number(params?.year ?? now.getFullYear()) || now.getFullYear();
    const householdContext = await getHouseholdContext(
        auth.userId,
        params?.spaceId,
    );

    if (!householdContext) {
        redirect('/spaces');
    }

    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 1);

    const transactions = await prisma.transaction.findMany({
        where: {
            householdId: householdContext.householdId,
            date: {
                gte: startDate,
                lt: endDate,
            },
            OR: [{ isPrivate: false }, { userId: auth.userId }],
        },
        include: {
            category: {
                select: {
                    id: true,
                    name: true,
                    color: true,
                    icon: true,
                },
            },
        },
        orderBy: {
            date: 'desc',
        },
    });

    const normalizedTransactions = transactions.map((transaction) => {
        const { status: legacyStatus, note } = parseTransactionStatus(
            transaction.note,
        );
        const dbPaymentStatus =
            (transaction as { paymentStatus?: 'PENDING' | 'PAID' })
                .paymentStatus ?? 'PENDING';

        return {
            id: transaction.id,
            description: transaction.description,
            amount: transaction.amount.toNumber(),
            date: transaction.date,
            categoryId: transaction.categoryId,
            category: {
                name: transaction.category.name,
                color: transaction.category.color,
                icon: transaction.category.icon ?? undefined,
            },
            userId: transaction.userId,
            payerId: transaction.payerId,
            isShared: transaction.isShared,
            isPrivate: transaction.isPrivate,
            debtType: transaction.debtType,
            paymentStatus:
                dbPaymentStatus === 'PENDING' && legacyStatus === 'PAID'
                    ? 'PAID'
                    : dbPaymentStatus,
            note,
        };
    });

    const partnerId = householdContext.partner?.id;
    const partnerName = householdContext.partner?.name ?? 'Parceiro(a)';

    const pendingTransactions = normalizedTransactions.filter(
        (transaction) => transaction.paymentStatus === 'PENDING',
    );

    const yourSpent = pendingTransactions
        .filter((transaction) => transaction.userId === auth.userId)
        .reduce((sum, transaction) => sum + transaction.amount, 0);

    const partnerSpent = partnerId
        ? pendingTransactions
              .filter((transaction) => transaction.userId === partnerId)
              .reduce((sum, transaction) => sum + transaction.amount, 0)
        : 0;

    const totalSpent = yourSpent + partnerSpent;

    const monthlyIncomeSummary = await getMonthlyIncomeSummary({
        householdId: householdContext.householdId,
        month: selectedMonth,
        year: selectedYear,
        pendingExpensesTotal: totalSpent,
    });

    const salaryMonth = monthlyIncomeSummary.data?.salaryMonth ?? 0;
    const freeAmount = monthlyIncomeSummary.data?.freeAmount ?? -totalSpent;
    const hasConfiguredSalary =
        monthlyIncomeSummary.data?.hasConfiguredSalary ?? false;

    const categoryTotals = new Map<
        string,
        { name: string; total: number; color: string; icon?: string }
    >();

    for (const transaction of normalizedTransactions.filter(
        (item) => item.userId === auth.userId,
    )) {
        const current = categoryTotals.get(transaction.categoryId) ?? {
            name: transaction.category.name,
            total: 0,
            color: transaction.category.color,
            icon: transaction.category.icon,
        };

        current.total += transaction.amount;
        categoryTotals.set(transaction.categoryId, current);
    }

    const categoryChartMap = new Map<
        string,
        { name: string; total: number; color: string }
    >();

    for (const transaction of normalizedTransactions) {
        const current = categoryChartMap.get(transaction.categoryId) ?? {
            name: transaction.category.name,
            total: 0,
            color: transaction.category.color,
        };

        current.total += transaction.amount;
        categoryChartMap.set(transaction.categoryId, current);
    }

    const dailyMap = new Map<string, number>();
    for (const transaction of normalizedTransactions) {
        const day = new Date(transaction.date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
        });
        dailyMap.set(day, (dailyMap.get(day) ?? 0) + transaction.amount);
    }

    const dailyTrend = Array.from(dailyMap.entries())
        .map(([day, total]) => ({ day, total: Number(total.toFixed(2)) }))
        .sort((a, b) => {
            const [da, ma] = a.day.split('/').map(Number);
            const [db, mb] = b.day.split('/').map(Number);
            return ma === mb ? da - db : ma - mb;
        });

    const settlementBalance = calculateSettlement(
        normalizedTransactions.map((transaction) => ({
            id: transaction.id,
            amount: transaction.amount,
            isShared: transaction.isShared,
            userId: transaction.userId,
            payerId: transaction.payerId,
        })),
        auth.userId,
    );

    const settlement = getSettlementDetails(
        settlementBalance,
        auth.name ?? 'Você',
        partnerName,
    );

    return (
        <div className='min-h-screen bg-gray-50 p-4 md:p-6 pb-24'>
            <div className='max-w-2xl mx-auto space-y-6'>
                <div className='flex items-start justify-between'>
                    <div>
                        <Link
                            href='/spaces'
                            className='text-xs text-indigo-600 hover:underline'
                        >
                            Voltar para spaces
                        </Link>
                        <h1 className='text-3xl font-bold text-gray-900'>
                            Olá, {auth.name ?? 'você'}!
                        </h1>
                        <p className='text-gray-600 mt-1'>
                            Space: {householdContext.householdName}
                        </p>
                    </div>

                    <LoadingNavButton
                        href={`/expenses/new?spaceId=${householdContext.householdId}`}
                        size='icon'
                        className='rounded-full h-12 w-12 shadow-lg hover:shadow-xl transition-shadow'
                        title='Adicionar despesa'
                    >
                        <Plus className='h-6 w-6' />
                    </LoadingNavButton>
                </div>

                <div className='flex justify-end'>
                    <LoadingNavButton
                        href={`/onboarding?spaceId=${householdContext.householdId}`}
                        variant='outline'
                        className='gap-2'
                        loadingLabel='Abrindo...'
                    >
                        <Users className='h-4 w-4' />
                        Convidar membros
                    </LoadingNavButton>
                </div>

                <SettlementCard
                    settlement={settlement}
                    partnerName={partnerName}
                />

                <SpendingSummary
                    yourSpent={yourSpent}
                    totalSpent={totalSpent}
                />

                <MonthlyIncomeCard
                    householdId={householdContext.householdId}
                    month={selectedMonth}
                    year={selectedYear}
                    salaryMonth={salaryMonth}
                    pendingExpensesTotal={totalSpent}
                    freeAmount={freeAmount}
                    hasConfiguredSalary={hasConfiguredSalary}
                />

                <CategoryBreakdown
                    categories={Array.from(categoryTotals.values())}
                />

                <CategoryDonutChart
                    data={Array.from(categoryChartMap.values())}
                />

                <DailyTrendChart data={dailyTrend} />

                <TransactionsList
                    transactions={normalizedTransactions}
                    currentUserId={auth.userId}
                    householdId={householdContext.householdId}
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    categories={householdContext.categories.map((category) => ({
                        id: category.id,
                        name: category.name,
                    }))}
                    participants={householdContext.members}
                />

                <div className='pt-4 text-center'>
                    <LoadingNavButton
                        href={`/expenses/new?spaceId=${householdContext.householdId}`}
                        size='lg'
                        className='w-full h-12 rounded-lg font-semibold text-base'
                        loadingLabel='Abrindo...'
                    >
                        Registrar Nova Despesa
                    </LoadingNavButton>
                </div>
            </div>
        </div>
    );
}
