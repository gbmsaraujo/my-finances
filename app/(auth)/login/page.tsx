'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sendLoginOtp, verifyOtp } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'request' | 'verify'>('request');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleRequestOtp(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        const result = await sendLoginOtp(email.trim());

        if (!result.success) {
            setError(result.error ?? 'Não foi possível enviar o código');
            setLoading(false);
            return;
        }

        setMessage(
            'Código enviado para seu email. Confira a caixa de entrada.',
        );
        setStep('verify');
        setLoading(false);
    }

    async function handleVerifyOtp(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await verifyOtp(email.trim(), otp.trim());

        if (!result.success) {
            setError(result.error ?? 'Código inválido');
            setLoading(false);
            return;
        }

        if (result.data?.needsOnboarding) {
            router.push('/onboarding');
        } else {
            router.push('/dashboard');
        }
        router.refresh();
    }

    return (
        <main className='min-h-screen bg-slate-100 flex items-center justify-center p-4'>
            <div className='w-full max-w-sm rounded-xl bg-white p-6 shadow-md space-y-4'>
                <h1 className='text-2xl font-semibold text-slate-900'>
                    Entrar
                </h1>
                <p className='text-sm text-slate-600'>
                    Use seu email e código de 6 dígitos.
                </p>

                {step === 'request' ? (
                    <form className='space-y-3' onSubmit={handleRequestOtp}>
                        <Input
                            type='email'
                            required
                            placeholder='seuemail@exemplo.com'
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                        <Button
                            type='submit'
                            className='w-full'
                            disabled={loading}
                        >
                            {loading ? 'Enviando...' : 'Enviar código'}
                        </Button>
                    </form>
                ) : (
                    <form className='space-y-3' onSubmit={handleVerifyOtp}>
                        <Input
                            required
                            placeholder='Código de 6 dígitos'
                            value={otp}
                            inputMode='numeric'
                            maxLength={6}
                            onChange={(event) =>
                                setOtp(
                                    event.target.value
                                        .replace(/\D/g, '')
                                        .slice(0, 6),
                                )
                            }
                        />
                        <Button
                            type='submit'
                            className='w-full'
                            disabled={loading}
                        >
                            {loading ? 'Validando...' : 'Entrar'}
                        </Button>
                    </form>
                )}

                {message ? (
                    <p className='text-xs text-emerald-700'>{message}</p>
                ) : null}
                {error ? <p className='text-xs text-red-600'>{error}</p> : null}

                <p className='text-sm text-slate-600'>
                    Ainda não tem conta?{' '}
                    <Link className='text-indigo-600' href='/signup'>
                        Criar conta
                    </Link>
                </p>
            </div>
        </main>
    );
}
