'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { signOut } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';

interface AppHeaderProps {
    userName: string | null;
}

export function AppHeader({ userName }: AppHeaderProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleLogout() {
        setLoading(true);
        try {
            const result = await signOut();

            if (!result.success) {
                toast.error(result.error ?? 'Não foi possível sair da conta.');
                return;
            }

            setOpen(false);
            toast.success('Logout realizado com sucesso.');
            router.push('/login');
            router.refresh();
        } finally {
            setLoading(false);
        }
    }

    return (
        <header className='border-b border-slate-200 bg-white'>
            <div className='mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3'>
                <div>
                    <Link
                        href='/spaces'
                        className='text-lg font-semibold text-slate-900'
                    >
                        My Finances
                    </Link>
                    <p className='text-xs text-slate-500'>
                        Seus spaces e despesas
                    </p>
                </div>

                <div className='relative'>
                    <Button
                        type='button'
                        variant='outline'
                        onClick={() => setOpen((state) => !state)}
                        className='gap-2'
                    >
                        <User className='h-4 w-4' />
                        <span className='max-w-32 truncate'>
                            {userName ?? 'Perfil'}
                        </span>
                        <ChevronDown className='h-4 w-4' />
                    </Button>

                    {open ? (
                        <div className='absolute right-0 z-50 mt-2 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg'>
                            <Link
                                href='/spaces'
                                onClick={() => setOpen(false)}
                                className='block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100'
                            >
                                Meus spaces
                            </Link>
                            <Link
                                href='/profile/change-password'
                                onClick={() => setOpen(false)}
                                className='mt-1 block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100'
                            >
                                Alterar senha
                            </Link>
                            <button
                                type='button'
                                onClick={handleLogout}
                                disabled={loading}
                                className='mt-1 flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60'
                            >
                                <LogOut className='h-4 w-4' />
                                {loading ? 'Saindo...' : 'Logout'}
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </header>
    );
}
