'use client';

import { ReactNode, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ButtonProps } from '@/components/ui/button';

interface LoadingNavButtonProps extends Omit<ButtonProps, 'onClick'> {
    href: string;
    children: ReactNode;
    loadingLabel?: string;
}

export function LoadingNavButton({
    href,
    children,
    loadingLabel,
    disabled,
    size,
    ...props
}: LoadingNavButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    function handleNavigate() {
        startTransition(() => {
            router.push(href);
        });
    }

    return (
        <Button
            {...props}
            size={size}
            onClick={handleNavigate}
            disabled={disabled || isPending}
        >
            {isPending
                ? size === 'icon'
                    ? '...'
                    : (loadingLabel ?? 'Carregando...')
                : children}
        </Button>
    );
}
