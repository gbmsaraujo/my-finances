import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ServiceWorkerRegister } from '@/app/components/ServiceWorkerRegister';

export const metadata: Metadata = {
    title: 'My Finances',
    description: 'Gestao financeira para casais',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'My Finances',
    },
};

export const viewport: Viewport = {
    themeColor: '#4f46e5',
};

export default function RootLayout({
    children,
}: Readonly<{ children: ReactNode }>) {
    return (
        <html lang='pt-BR'>
            <body>
                <ServiceWorkerRegister />
                <Toaster richColors position='top-right' />
                {children}
            </body>
        </html>
    );
}
