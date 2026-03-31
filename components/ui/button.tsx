import * as React from 'react';

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'destructive';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
    default: 'bg-indigo-600 text-white hover:bg-indigo-500',
    secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300',
    outline:
        'border border-slate-300 bg-transparent text-slate-900 hover:bg-slate-100',
    destructive: 'bg-red-600 text-white hover:bg-red-500',
};

const sizeClasses: Record<ButtonSize, string> = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 px-3',
    lg: 'h-11 px-6',
    icon: 'h-10 w-10',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    function Button(
        { className = '', variant = 'default', size = 'default', ...props },
        ref,
    ) {
        return (
            <button
                ref={ref}
                className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
                {...props}
            />
        );
    },
);
