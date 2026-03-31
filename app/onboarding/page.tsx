'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ensureUserHousehold,
    joinHouseholdByCode,
    createInviteCode,
} from '@/app/actions/household';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function OnboardingPage() {
    const router = useRouter();
    const [inviteCode, setInviteCode] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleCreateSpace() {
        setLoading(true);
        setError('');
        setMessage('');

        const result = await ensureUserHousehold();

        if (!result.success) {
            setError(result.error ?? 'Não foi possível criar o space');
            setLoading(false);
            return;
        }

        setMessage("Space 'Despesas de casa' pronto para uso.");
        setLoading(false);
        router.push('/dashboard');
        router.refresh();
    }

    async function handleCreateInvite() {
        setLoading(true);
        setError('');
        setMessage('');

        const normalizedEmail = inviteEmail.trim() || undefined;
        const result = await createInviteCode(normalizedEmail);

        if (!result.success || !result.data) {
            setError(result.error ?? 'Erro ao gerar convite');
            setLoading(false);
            return;
        }

        setGeneratedCode(result.data.code);

        if (normalizedEmail && result.data.emailed) {
            setMessage(
                `Convite enviado para ${normalizedEmail}. Código válido por 30 min.`,
            );
        } else if (normalizedEmail && !result.data.emailed) {
            setMessage(
                `Não consegui enviar email automático. Compartilhe manualmente o código: ${result.data.code}`,
            );
        } else {
            setMessage(
                `Código gerado com validade de 30 min: ${result.data.code}`,
            );
        }

        setLoading(false);
    }

    async function handleJoinByCode(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await joinHouseholdByCode(inviteCode);

        if (!result.success) {
            setError(result.error ?? 'Código inválido');
            setLoading(false);
            return;
        }

        router.push('/dashboard');
        router.refresh();
    }

    return (
        <main className='min-h-screen bg-slate-100 p-4 flex items-center justify-center'>
            <div className='w-full max-w-lg rounded-xl bg-white p-6 shadow-md space-y-6'>
                <div>
                    <h1 className='text-2xl font-semibold text-slate-900'>
                        Vamos configurar seu space
                    </h1>
                    <p className='text-sm text-slate-600'>
                        Você pode criar automaticamente o space "Despesas de
                        casa" ou entrar com código de convite.
                    </p>
                </div>

                <div className='space-y-2'>
                    <Input
                        type='email'
                        placeholder='Email do parceiro (opcional para envio automático)'
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                    />
                    <Button
                        className='w-full'
                        onClick={handleCreateSpace}
                        disabled={loading}
                    >
                        Criar space "Despesas de casa"
                    </Button>
                    <Button
                        variant='outline'
                        className='w-full'
                        onClick={handleCreateInvite}
                        disabled={loading}
                    >
                        Gerar convite (código/email)
                    </Button>
                    {generatedCode ? (
                        <p className='text-sm text-indigo-700'>
                            Compartilhe este código: {generatedCode}
                        </p>
                    ) : null}
                </div>

                <form className='space-y-2' onSubmit={handleJoinByCode}>
                    <Input
                        placeholder='Código de convite (6 dígitos)'
                        inputMode='numeric'
                        maxLength={6}
                        value={inviteCode}
                        onChange={(event) =>
                            setInviteCode(
                                event.target.value
                                    .replace(/\D/g, '')
                                    .slice(0, 6),
                            )
                        }
                    />
                    <Button
                        type='submit'
                        variant='secondary'
                        className='w-full'
                        disabled={loading}
                    >
                        Entrar em um space com código
                    </Button>
                </form>

                {message ? (
                    <p className='text-xs text-emerald-700'>{message}</p>
                ) : null}
                {error ? <p className='text-xs text-red-600'>{error}</p> : null}
            </div>
        </main>
    );
}
