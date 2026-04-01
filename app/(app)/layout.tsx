import { ReactNode } from 'react';
import { AppHeader } from '@/app/components/AppHeader';
import { requireAuthUser } from '@/lib/auth';

interface AppLayoutProps {
    children: ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
    const auth = await requireAuthUser();

    return (
        <div className='min-h-screen bg-slate-50'>
            <AppHeader userName={auth.name} />
            {children}
        </div>
    );
}
