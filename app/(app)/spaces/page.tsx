import { redirect } from 'next/navigation';
import { ensureUserHousehold } from '@/app/actions/household';
import { LoadingNavButton } from '@/app/components/LoadingNavButton';
import { requireAuthUser } from '@/lib/auth';
import { listUserSpaces } from '@/lib/household';

export default async function SpacesPage() {
    const auth = await requireAuthUser();
    await ensureUserHousehold(auth.userId);

    const spaces = await listUserSpaces(auth.userId);

    if (spaces.length === 0) {
        redirect('/onboarding');
    }

    return (
        <main className='mx-auto w-full max-w-4xl p-4 md:p-6'>
            <div className='mb-6'>
                <h1 className='text-2xl font-semibold text-slate-900'>
                    Meus spaces
                </h1>
                <p className='text-sm text-slate-600'>
                    Escolha um space para visualizar despesas e convidar
                    membros.
                </p>
            </div>

            <div className='grid gap-3'>
                {spaces.map((space) => (
                    <div
                        key={space.householdId}
                        className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'
                    >
                        <div className='flex items-center justify-between gap-3'>
                            <div>
                                <h2 className='text-lg font-semibold text-slate-900'>
                                    {space.householdName}
                                </h2>
                                <p className='text-sm text-slate-600'>
                                    {space.memberCount} participante(s) •{' '}
                                    {space.role}
                                </p>
                            </div>
                            <div className='flex gap-2'>
                                <LoadingNavButton
                                    href={`/dashboard?spaceId=${space.householdId}`}
                                    loadingLabel='Entrando...'
                                >
                                    Entrar
                                </LoadingNavButton>
                                <LoadingNavButton
                                    href={`/onboarding?spaceId=${space.householdId}`}
                                    variant='outline'
                                    loadingLabel='Abrindo...'
                                >
                                    Convidar membros
                                </LoadingNavButton>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
