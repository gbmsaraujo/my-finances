'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { requestPasswordReset } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);

        try {
            const result = await requestPasswordReset(email.trim());

            if (!result.success) {
                toast.error(
                    result.error ??
                        'Não foi possível enviar o link de redefinição.',
                );
                return;
            }

            toast.success(
                'Link enviado! Verifique seu email para redefinir a senha.',
            );
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
                    Esqueci minha senha
                </h1>
                <p className='text-sm text-slate-600'>
                    Digite seu email para receber um link de redefinição.
                </p>

                <form className='space-y-3' onSubmit={handleSubmit}>
                    <Input
                        type='email'
                        required
                        placeholder='seuemail@exemplo.com'
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                    <Button type='submit' className='w-full' disabled={loading}>
                        {loading
                            ? 'Enviando link...'
                            : 'Enviar link de redefinição'}
                    </Button>
                </form>

                <p className='text-sm text-slate-600'>
                    Lembrou sua senha?{' '}
                    <Link className='text-indigo-600' href='/login'>
                        Entrar
                    </Link>
                </p>
            </div>
        </main>
    );
}
