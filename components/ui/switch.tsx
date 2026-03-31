import * as React from 'react';

interface SwitchProps {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
}

export function Switch({
    checked = false,
    onCheckedChange,
    disabled,
}: SwitchProps) {
    return (
        <button
            type='button'
            role='switch'
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onCheckedChange?.(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                checked ? 'bg-indigo-600' : 'bg-slate-300'
            } ${disabled ? 'opacity-50' : ''}`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    checked ? 'translate-x-5' : 'translate-x-1'
                }`}
            />
        </button>
    );
}
