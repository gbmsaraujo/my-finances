import * as React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

export function Badge({
    className = '',
    variant = 'default',
    ...props
}: BadgeProps) {
    const variantClass = {
        default: 'bg-indigo-100 text-indigo-800',
        secondary: 'bg-slate-100 text-slate-800',
        outline: 'border border-slate-300 text-slate-800',
        destructive: 'bg-red-100 text-red-700',
    }[variant];

    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantClass} ${className}`}
            {...props}
        />
    );
}
