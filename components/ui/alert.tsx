import * as React from 'react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'destructive';
}

export function Alert({
    className = '',
    variant = 'default',
    ...props
}: AlertProps) {
    const colorClass =
        variant === 'destructive'
            ? 'border-red-300 bg-red-50 text-red-900'
            : 'border-slate-300 bg-white text-slate-900';

    return (
        <div
            role='alert'
            className={`rounded-md border p-4 ${colorClass} ${className}`}
            {...props}
        />
    );
}

export function AlertDescription({
    className = '',
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={`text-sm ${className}`} {...props} />;
}
