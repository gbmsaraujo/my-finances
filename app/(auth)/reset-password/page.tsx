'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateCurrentUserPassword } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        setLoading(true);

        try {
            if (password !== confirmPassword) {
                toast.error('As senhas não coincidem.');
                return;
            }

            const result = await updateCurrentUserPassword(password);

            if (!result.success) {
                toast.error(
                    result.error ?? 'Não foi possível redefinir sua senha.',
                );
                return;
            }

            toast.success(
                'Senha redefinida com sucesso. Faça login novamente.',
            );
            router.push('/login');
            router.refresh();
        } catch {
            toast.error('Falha ao comunicar com o servidor. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className='min-h-screen bg-slate-100 flex items-center justify-center p-4'>
            <div className='w-full max-w-sm rounded-xl bg-white p-6 shadow-md space-y-4'>
                <h1 className='text-2xl font-semibold text-slate-900'>
                    Redefinir senha
                </h1>
                <p className='text-sm text-slate-600'>
                    Digite sua nova senha para concluir a recuperação.
                </p>

                <form className='space-y-3' onSubmit={handleSubmit}>
                    <Input
                        type='password'
                        required
                        minLength={6}
                        placeholder='Nova senha'
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                    <Input
                        type='password'
                        required
                        minLength={6}
                        placeholder='Confirme a nova senha'
                        value={confirmPassword}
                        onChange={(event) =>
                            setConfirmPassword(event.target.value)
                        }
                    />
                    <Button type='submit' className='w-full' disabled={loading}>
                        {loading ? 'Atualizando senha...' : 'Salvar nova senha'}
                    </Button>
                </form>

                <p className='text-sm text-slate-600'>
                    Voltar para{' '}
                    <Link className='text-indigo-600' href='/login'>
                        login
                    </Link>
                </p>
            </div>
        </main>
    );
}
