import { redirect } from 'next/navigation';
import { TransactionForm } from '@/app/components/TransactionForm';
import { requireAuthUser } from '@/lib/auth';
import { getHouseholdContext } from '@/lib/household';
import { ensureUserHousehold } from '@/app/actions/household';

export default async function AddExpensePage() {
    const auth = await requireAuthUser();
    await ensureUserHousehold();
    const householdContext = await getHouseholdContext(auth.userId);

    if (!householdContext) {
        redirect('/onboarding');
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4'>
            <div className='max-w-md mx-auto pt-4'>
                <div className='mb-8'>
                    <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                        Nova Despesa
                    </h1>
                    <p className='text-gray-600'>
                        Registre um gasto rápido e preciso
                    </p>
                </div>

                <div className='bg-white rounded-2xl shadow-lg p-6'>
                    <TransactionForm
                        categories={householdContext.categories.map(
                            (category) => ({
                                id: category.id,
                                name: category.name,
                                icon: category.icon ?? undefined,
                            }),
                        )}
                        currentUserId={auth.userId}
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
