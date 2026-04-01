'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { signInWithPassword } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSignupCta, setShowSignupCta] = useState(false);

    async function handleLogin(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setShowSignupCta(false);

        try {
            const result = await signInWithPassword(email.trim(), password);

            if (!result.success) {
                toast.error(result.error ?? 'Não foi possível entrar');
                setShowSignupCta(result.code === 'USER_NOT_FOUND');
                setLoading(false);
                return;
            }

            if (result.data?.needsOnboarding) {
                router.push('/onboarding');
            } else {
                router.push('/spaces');
            }
            router.refresh();
        } catch {
            toast.error('Falha ao comunicar com o servidor. Tente novamente.');
            setLoading(false);
        }
    }

    return (
        <main className='min-h-screen bg-slate-100 flex items-center justify-center p-4'>
            <div className='w-full max-w-sm rounded-xl bg-white p-6 shadow-md space-y-4'>
                <h1 className='text-2xl font-semibold text-slate-900'>
                    Entrar
                </h1>
                <p className='text-sm text-slate-600'>
                    Use seu email e senha para acessar.
                </p>

                <form className='space-y-3' onSubmit={handleLogin}>
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
                        placeholder='Sua senha'
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                    <Button type='submit' className='w-full' disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                </form>

                <Link
                    href='/forgot-password'
                    className='inline-block text-xs text-indigo-600 underline'
                >
                    Esqueci minha senha
                </Link>

                {showSignupCta ? (
                    <Link
                        href={`/signup?email=${encodeURIComponent(email.trim())}`}
                        className='inline-block text-xs text-indigo-600 underline'
                    >
                        Ir para cadastro com este email
                    </Link>
                ) : null}

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
