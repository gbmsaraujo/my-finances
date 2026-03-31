'use client';

import * as React from 'react';
import {
    Controller,
    FormProvider,
    useFormContext,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
} from 'react-hook-form';

export const Form = FormProvider;

const FormFieldContext = React.createContext<{ name: string } | null>(null);

export function FormField<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
    return (
        <FormFieldContext.Provider value={{ name: props.name as string }}>
            <Controller {...props} />
        </FormFieldContext.Provider>
    );
}

const FormItemContext = React.createContext<{ id: string } | null>(null);

export function FormItem({
    className = '',
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    const id = React.useId();
    return (
        <FormItemContext.Provider value={{ id }}>
            <div className={`space-y-2 ${className}`} {...props} />
        </FormItemContext.Provider>
    );
}

function useFormField() {
    const fieldContext = React.useContext(FormFieldContext);
    const itemContext = React.useContext(FormItemContext);
    const { getFieldState, formState } = useFormContext();

    if (!fieldContext || !itemContext) {
        throw new Error(
            'useFormField must be used within <FormField> and <FormItem>',
        );
    }

    const fieldState = getFieldState(fieldContext.name, formState);
    const baseId = itemContext.id;

    return {
        name: fieldContext.name,
        formItemId: `${baseId}-form-item`,
        formDescriptionId: `${baseId}-form-item-description`,
        formMessageId: `${baseId}-form-item-message`,
        error: fieldState.error,
    };
}

export function FormLabel({
    className = '',
    ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
    const { formItemId, error } = useFormField();
    return (
        <label
            htmlFor={formItemId}
            className={`${error ? 'text-red-600' : 'text-slate-800'} text-sm font-medium ${className}`}
            {...props}
        />
    );
}

export function FormControl({
    className = '',
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    const { formItemId, formDescriptionId, formMessageId, error } =
        useFormField();
    return (
        <div
            id={formItemId}
            aria-describedby={
                error
                    ? `${formDescriptionId} ${formMessageId}`
                    : formDescriptionId
            }
            aria-invalid={Boolean(error)}
            className={className}
            {...props}
        />
    );
}

export function FormDescription({
    className = '',
    ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
    const { formDescriptionId } = useFormField();
    return (
        <p
            id={formDescriptionId}
            className={`text-xs text-slate-500 ${className}`}
            {...props}
        />
    );
}

export function FormMessage({
    className = '',
    children,
    ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error.message) : children;
    if (!body) {
        return null;
    }
    return (
        <p
            id={formMessageId}
            className={`text-xs font-medium text-red-600 ${className}`}
            {...props}
        >
            {body}
        </p>
    );
}
