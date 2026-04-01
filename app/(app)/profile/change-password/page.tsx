'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { updateCurrentUserPassword } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ChangePasswordPage() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        setLoading(true);

        try {
            if (newPassword !== confirmPassword) {
                toast.error('As senhas não coincidem.');
                return;
            }

            const result = await updateCurrentUserPassword(newPassword);

            if (!result.success) {
                toast.error(
                    result.error ?? 'Não foi possível alterar a senha.',
                );
                return;
            }

            toast.success('Senha alterada com sucesso.');
            setNewPassword('');
            setConfirmPassword('');
        } catch {
            toast.error('Falha ao comunicar com o servidor. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className='mx-auto w-full max-w-xl p-4'>
            <div className='rounded-xl bg-white p-6 shadow-md space-y-4'>
                <h1 className='text-2xl font-semibold text-slate-900'>
                    Alterar senha
                </h1>
                <p className='text-sm text-slate-600'>
                    Defina uma nova senha para sua conta.
                </p>

                <form className='space-y-3' onSubmit={handleSubmit}>
                    <Input
                        type='password'
                        required
                        minLength={6}
                        placeholder='Nova senha'
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
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
                        {loading ? 'Salvando...' : 'Salvar nova senha'}
                    </Button>
                </form>

                <Link
                    href='/spaces'
                    className='inline-block text-sm text-indigo-600'
                >
                    Voltar para spaces
                </Link>
            </div>
        </main>
    );
}
