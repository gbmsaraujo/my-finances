import * as React from 'react';

export function Card({
    className = '',
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`rounded-lg border border-slate-200 bg-white ${className}`}
            {...props}
        />
    );
}

export function CardHeader({
    className = '',
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={`p-6 pb-2 ${className}`} {...props} />;
}

export function CardTitle({
    className = '',
    ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={`text-xl font-semibold text-slate-900 ${className}`}
            {...props}
        />
    );
}

export function CardDescription({
    className = '',
    ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className={`text-sm text-slate-500 ${className}`} {...props} />;
}

export function CardContent({
    className = '',
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={`p-6 pt-2 ${className}`} {...props} />;
}
