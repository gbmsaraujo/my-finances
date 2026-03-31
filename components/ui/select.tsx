'use client';

import * as React from 'react';

interface SelectContextValue {
    value?: string;
    setValue: (value: string) => void;
    placeholder?: string;
    registerOption: (value: string, label: string) => void;
    options: Record<string, string>;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

interface SelectProps {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
}

export function Select({
    value,
    defaultValue,
    onValueChange,
    children,
}: SelectProps) {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const [options, setOptions] = React.useState<Record<string, string>>({});

    const currentValue = value !== undefined ? value : internalValue;

    const registerOption = React.useCallback(
        (optionValue: string, label: string) => {
            setOptions((prev) =>
                prev[optionValue] ? prev : { ...prev, [optionValue]: label },
            );
        },
        [],
    );

    const setValue = React.useCallback(
        (next: string) => {
            if (value === undefined) {
                setInternalValue(next);
            }
            onValueChange?.(next);
        },
        [onValueChange, value],
    );

    return (
        <SelectContext.Provider
            value={{ value: currentValue, setValue, registerOption, options }}
        >
            <div className='space-y-2'>{children}</div>
        </SelectContext.Provider>
    );
}

export function SelectTrigger({
    className = '',
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`flex min-h-10 w-full items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ${className}`}
            {...props}
        />
    );
}

interface SelectValueProps {
    placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
    const ctx = React.useContext(SelectContext);
    if (!ctx) {
        return null;
    }
    const label = ctx.value
        ? (ctx.options[ctx.value] ?? ctx.value)
        : placeholder;
    return (
        <span className={ctx.value ? 'text-slate-900' : 'text-slate-400'}>
            {label}
        </span>
    );
}

export function SelectContent({
    className = '',
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={`grid gap-2 ${className}`} {...props} />;
}

interface SelectItemProps {
    value: string;
    children: React.ReactNode;
}

export function SelectItem({ value, children }: SelectItemProps) {
    const ctx = React.useContext(SelectContext);

    React.useEffect(() => {
        if (!ctx) {
            return;
        }
        const textLabel = typeof children === 'string' ? children : value;
        ctx.registerOption(value, textLabel);
    }, [children, ctx, value]);

    if (!ctx) {
        return null;
    }

    const selected = ctx.value === value;

    return (
        <button
            type='button'
            onClick={() => ctx.setValue(value)}
            className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                selected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
        >
            {children}
        </button>
    );
}
