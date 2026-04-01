'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { LoadingNavButton } from '@/app/components/LoadingNavButton';
import { ensureUserHousehold, createInviteCode } from '@/app/actions/household';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function OnboardingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedSpaceId = searchParams.get('spaceId') ?? undefined;
    const [inviteEmail, setInviteEmail] = useState('');
    const [creatingInvite, setCreatingInvite] = useState(false);

    async function handleCreateInvite() {
        setCreatingInvite(true);

        try {
            const normalizedEmail = inviteEmail.trim().toLowerCase();
            if (!normalizedEmail) {
                toast.error('Informe um email para enviar o convite.');
                return;
            }

            const ensuredHousehold = await ensureUserHousehold();
            if (!ensuredHousehold.success || !ensuredHousehold.data) {
                toast.error(
                    ensuredHousehold.error ??
                        'Não foi possível preparar o space',
                );
                return;
            }

            const householdId =
                selectedSpaceId ?? ensuredHousehold.data.householdId;
            const result = await createInviteCode(normalizedEmail, householdId);

            if (!result.success || !result.data) {
                toast.error(result.error ?? 'Erro ao gerar convite');
                return;
            }

            toast.success(`Convite enviado para ${normalizedEmail}.`);
            setInviteEmail('');
        } catch {
            toast.error('Falha ao comunicar com o servidor. Tente novamente.');
        } finally {
            setCreatingInvite(false);
        }
    }

    return (
        <main className='min-h-screen bg-slate-100 p-4 flex items-center justify-center'>
            <div className='w-full max-w-lg rounded-xl bg-white p-6 shadow-md space-y-6'>
                <div>
                    <LoadingNavButton
                        href='/spaces'
                        variant='outline'
                        className='mb-4 rounded-lg'
                        loadingLabel='Voltando...'
                    >
                        <ArrowLeft className='h-4 w-4 mr-2' />
                        Voltar para meus spaces
                    </LoadingNavButton>
                    <h1 className='text-2xl font-semibold text-slate-900'>
                        Vamos configurar seu space
                    </h1>
                    <p className='text-sm text-slate-600'>
                        Você pode convidar pessoas para seu espaço via email.
                    </p>
                </div>

                <div className='space-y-2'>
                    <Input
                        type='email'
                        placeholder='Email de quem você quer convidar'
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                    />
                    <Button
                        className='w-full'
                        onClick={handleCreateInvite}
                        disabled={creatingInvite}
                    >
                        {creatingInvite
                            ? 'Enviando convite...'
                            : 'Enviar convite por email'}
                    </Button>
                </div>
            </div>
        </main>
    );
}
