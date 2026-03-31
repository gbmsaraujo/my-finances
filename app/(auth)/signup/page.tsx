'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sendSignupOtp, verifyOtp } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState('');
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

        const result = await sendSignupOtp(email.trim(), name.trim());

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

        router.push('/onboarding');
        router.refresh();
    }

    return (
        <main className='min-h-screen bg-slate-100 flex items-center justify-center p-4'>
            <div className='w-full max-w-sm rounded-xl bg-white p-6 shadow-md space-y-4'>
                <h1 className='text-2xl font-semibold text-slate-900'>
                    Criar conta
                </h1>
                <p className='text-sm text-slate-600'>
                    Cadastro com validação por código de 6 dígitos.
                </p>

                {step === 'request' ? (
                    <form className='space-y-3' onSubmit={handleRequestOtp}>
                        <Input
                            required
                            placeholder='Seu nome'
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                        />
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
                            {loading ? 'Validando...' : 'Finalizar cadastro'}
                        </Button>
                    </form>
                )}

                {message ? (
                    <p className='text-xs text-emerald-700'>{message}</p>
                ) : null}
                {error ? <p className='text-xs text-red-600'>{error}</p> : null}

                <p className='text-sm text-slate-600'>
                    Já tem conta?{' '}
                    <Link className='text-indigo-600' href='/login'>
                        Entrar
                    </Link>
                </p>
            </div>
        </main>
    );
}
