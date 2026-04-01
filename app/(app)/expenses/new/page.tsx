import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TransactionForm } from '@/app/components/TransactionForm';
import { LoadingNavButton } from '@/app/components/LoadingNavButton';
import { requireAuthUser } from '@/lib/auth';
import { getHouseholdContext } from '@/lib/household';
import { ensureUserHousehold } from '@/app/actions/household';

interface AddExpensePageProps {
    searchParams?: Promise<{ spaceId?: string }>;
}

export default async function AddExpensePage({
    searchParams,
}: AddExpensePageProps) {
    const auth = await requireAuthUser();
    await ensureUserHousehold(auth.userId);
    const params = searchParams ? await searchParams : undefined;
    const householdContext = await getHouseholdContext(
        auth.userId,
        params?.spaceId,
    );

    if (!householdContext) {
        redirect('/spaces');
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4'>
            <div className='max-w-md mx-auto pt-4'>
                <div className='mb-8'>
                    <LoadingNavButton
                        href={`/dashboard${params?.spaceId ? `?spaceId=${params.spaceId}` : ''}`}
                        variant='outline'
                        className='mb-4 rounded-lg'
                        loadingLabel='Voltando...'
                    >
                        <ArrowLeft className='h-4 w-4 mr-2' />
                        Voltar para o dashboard
                    </LoadingNavButton>

                    <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                        Nova Despesa
                    </h1>
                    <p className='text-gray-600'>
                        Registre um gasto rápido e preciso
                    </p>
                </div>

                <div className='bg-white rounded-2xl shadow-lg p-6'>
                    <TransactionForm
                        householdId={householdContext.householdId}
                        categories={householdContext.categories.map(
                            (category) => ({
                                id: category.id,
                                name: category.name,
                            }),
                        )}
                        currentUserId={auth.userId}
                        participants={householdContext.members.map(
                            (member) => ({
                                id: member.id,
                                name: member.name,
                            }),
                        )}
                        partnerUserId={householdContext.partner?.id}
                        partnerName={
                            householdContext.partner?.name ?? 'Parceiro(a)'
                        }
                    />
                </div>
            </div>
        </div>
    );
}
