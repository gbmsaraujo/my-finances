'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
    getInvitePreview,
    registerInvitedUserWithPassword,
} from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AcceptInvitePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [spaceName, setSpaceName] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingInvite, setLoadingInvite] = useState(false);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);

    useEffect(() => {
        const codeParam = searchParams.get('code') ?? '';
        const emailParam = searchParams.get('email') ?? '';

        setCode(codeParam.replace(/\D/g, '').slice(0, 6));
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [searchParams]);

    useEffect(() => {
        async function loadInvite() {
            if (code.length !== 6) {
                return;
            }

            setLoadingInvite(true);

            try {
                const invite = await getInvitePreview(code);
                if (!invite.success || !invite.data) {
                    toast.error(invite.error ?? 'Convite inválido ou expirado');
                    return;
                }

                setSpaceName(invite.data.householdName);
            } catch {
                toast.error('Erro ao validar convite. Tente novamente.');
            } finally {
                setLoadingInvite(false);
            }
        }

        loadInvite();
    }, [code]);

    useEffect(() => {
        if (cooldownSeconds <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldownSeconds]);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);

        try {
            if (password !== confirmPassword) {
                toast.error('As senhas não coincidem.');
                return;
            }

            const result = await registerInvitedUserWithPassword(
                code,
                email.trim(),
                password,
                name.trim(),
            );

            if (!result.success || !result.data) {
                toast.error(
                    result.error ?? 'Não foi possível aceitar o convite.',
                );
                if (result.code === 'RATE_LIMITED') {
                    setCooldownSeconds(result.retryAfterSeconds ?? 60);
                }
                return;
            }

            if (result.data.emailConfirmationRequired) {
                toast.success(
                    'Conta criada. Confirme seu email e depois faça login.',
                );
                router.push('/login');
                router.refresh();
                return;
            }

            toast.success(
                'Cadastro concluído! Redirecionando para seus spaces...',
            );
            router.push('/spaces');
            router.refresh();
        } catch {
            toast.error('Falha ao comunicar com o servidor. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className='min-h-screen bg-slate-100 flex items-center justify-center p-4'>
            <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-md space-y-4'>
                <h1 className='text-2xl font-semibold text-slate-900'>
                    Aceitar convite
                </h1>
                <p className='text-sm text-slate-600'>
                    {spaceName
                        ? `Você foi convidado para o space ${spaceName}.`
                        : loadingInvite
                          ? 'Validando convite...'
                          : 'Preencha seus dados para entrar no space.'}
                </p>

                <form className='space-y-3' onSubmit={handleSubmit}>
                    <Input
                        required
                        placeholder='Código do convite (6 dígitos)'
                        inputMode='numeric'
                        maxLength={6}
                        value={code}
                        onChange={(event) =>
                            setCode(
                                event.target.value
                                    .replace(/\D/g, '')
                                    .slice(0, 6),
                            )
                        }
                    />
                    <Input
                        required
                        placeholder='Seu nome'
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                    <Input
                        required
                        type='email'
                        placeholder='seuemail@exemplo.com'
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                    <Input
                        required
                        type='password'
                        minLength={6}
                        placeholder='Crie uma senha'
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                    <Input
                        required
                        type='password'
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
                        disabled={
                            loading || loadingInvite || cooldownSeconds > 0
                        }
                    >
                        {loadingInvite
                            ? 'Validando convite...'
                            : loading
                              ? 'Cadastrando...'
                              : cooldownSeconds > 0
                                ? `Tente novamente em ${cooldownSeconds}s`
                                : 'Cadastrar e entrar no space'}
                    </Button>
                </form>

                <p className='text-sm text-slate-600'>
                    Já tem conta?{' '}
                    <Link href='/login' className='text-indigo-600'>
                        Entrar
                    </Link>
                </p>
            </div>
        </main>
    );
}
