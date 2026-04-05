'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { signUpWithPassword } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);

    useEffect(() => {
        const prefilledEmail = searchParams.get('email');
        if (prefilledEmail && !email) {
            setEmail(prefilledEmail);
        }
    }, [email, searchParams]);

    useEffect(() => {
        if (cooldownSeconds <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldownSeconds]);

    async function handleSignup(e: FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            if (password !== confirmPassword) {
                toast.error('As senhas não coincidem.');
                return;
            }

            const result = await signUpWithPassword(
                email.trim(),
                password,
                name.trim(),
            );

            if (!result.success) {
                toast.error(result.error ?? 'Não foi possível criar conta');
                if (result.code === 'RATE_LIMITED') {
                    setCooldownSeconds(result.retryAfterSeconds ?? 60);
                }
                return;
            }

            toast.success(
                'Conta criada com sucesso. Vamos configurar seu space.',
            );
            router.push('/onboarding');
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
                    Criar conta
                </h1>
                <p className='text-sm text-slate-600'>
                    Crie seu acesso com email e senha.
                </p>

                <form className='space-y-3' onSubmit={handleSignup}>
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
                    <Input
                        type='password'
                        required
                        minLength={6}
                        placeholder='Crie uma senha'
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                    <Input
                        type='password'
                        required
                        minLength={6}
                        placeholder='Confirme a senha'
                        value={confirmPassword}
                        onChange={(event) =>
                            setConfirmPassword(event.target.value)
                        }
                    />
                    <Button
                        type='submit'
                        className='w-full'
                        disabled={loading || cooldownSeconds > 0}
                    >
                        {loading
                            ? 'Criando...'
                            : cooldownSeconds > 0
                              ? `Tente novamente em ${cooldownSeconds}s`
                              : 'Criar conta'}
                    </Button>
                </form>

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
