import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function HomePage() {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();

    if (data.user) {
        redirect('/spaces');
    }

    return (
        <main className='min-h-screen bg-slate-100 flex items-center justify-center p-6'>
            <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-md space-y-4'>
                <h1 className='text-2xl font-semibold text-slate-900'>
                    My Finances
                </h1>
                <p className='text-sm text-slate-600'>
                    Gestão de despesas para casal com divisão inteligente e
                    empréstimos.
                </p>
                <div className='grid gap-2'>
                    <Link
                        href='/login'
                        className='rounded-md bg-indigo-600 text-white px-4 py-2 text-center hover:bg-indigo-500'
                    >
                        Entrar
                    </Link>
                    <Link
                        href='/signup'
                        className='rounded-md border border-slate-300 px-4 py-2 text-center text-slate-700 hover:bg-slate-50'
                    >
                        Criar conta
                    </Link>
                </div>
            </div>
        </main>
    );
}
