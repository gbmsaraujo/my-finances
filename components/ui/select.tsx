'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectContextValue {
    value?: string;
    setValue: (value: string) => void;
    placeholder?: string;
    registerOption: (value: string, label: string) => void;
    options: Record<string, string>;
    open: boolean;
    setOpen: (open: boolean) => void;
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
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement | null>(null);

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
            setOpen(false);
        },
        [onValueChange, value],
    );

    React.useEffect(() => {
        function onClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    return (
        <SelectContext.Provider
            value={{
                value: currentValue,
                setValue,
                registerOption,
                options,
                open,
                setOpen,
            }}
        >
            <div className='relative space-y-2' ref={containerRef}>
                {children}
            </div>
        </SelectContext.Provider>
    );
}

export function SelectTrigger({
    className = '',
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const ctx = React.useContext(SelectContext);

    if (!ctx) {
        return null;
    }

    return (
        <button
            type='button'
            className={`flex min-h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ${className}`}
            aria-expanded={ctx.open}
            onClick={() => ctx.setOpen(!ctx.open)}
            {...props}
        >
            <span className='truncate'>{props.children}</span>
            <ChevronDown className='h-4 w-4 text-slate-500' />
        </button>
    );
}

interface SelectValueProps {
    placeholder?: string;
    children?: React.ReactNode;
}

export function SelectValue({ placeholder, children }: SelectValueProps) {
    const ctx = React.useContext(SelectContext);
    if (!ctx) {
        return null;
    }
    const fallbackChildren = getNodeText(children);
    const resolvedLabel = ctx.value
        ? (ctx.options[ctx.value] ?? fallbackChildren) || ctx.value
        : fallbackChildren || placeholder;
    return (
        <span className={ctx.value ? 'text-slate-900' : 'text-slate-400'}>
            {resolvedLabel}
        </span>
    );
}

function getNodeText(node: React.ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }

    if (Array.isArray(node)) {
        return node.map(getNodeText).join('').trim();
    }

    if (React.isValidElement(node)) {
        return getNodeText(node.props.children);
    }

    return '';
}

export function SelectContent({
    className = '',
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    const ctx = React.useContext(SelectContext);

    if (!ctx) {
        return null;
    }

    return (
        <div
            className={`absolute z-50 mt-2 grid max-h-64 w-full gap-2 overflow-auto rounded-md border border-slate-200 bg-white p-2 shadow-lg ${ctx.open ? '' : 'hidden'} ${className}`}
            {...props}
        />
    );
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
        const textLabel = getNodeText(children) || value;
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
