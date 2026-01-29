"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormFieldContextValue {
  id: string;
  name: string;
  error?: string;
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

export function useFormField() {
  const context = React.useContext(FormFieldContext);
  if (!context) {
    throw new Error("useFormField must be used within a FormField");
  }
  return context;
}

interface FormFieldProps {
  name: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ name, error, children, className }: FormFieldProps) {
  const id = React.useId();

  return (
    <FormFieldContext.Provider value={{ id, name, error }}>
      <div className={cn("space-y-2", className)}>{children}</div>
    </FormFieldContext.Provider>
  );
}

interface FormLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  required?: boolean;
}

export function FormLabel({ className, required, children, ...props }: FormLabelProps) {
  const { id, error } = useFormField();

  return (
    <Label
      htmlFor={id}
      className={cn(error && "text-destructive", className)}
      {...props}
    >
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </Label>
  );
}

interface FormControlProps {
  children: React.ReactElement<{
    id?: string;
    name?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }>;
}

export function FormControl({ children }: FormControlProps) {
  const { id, name, error } = useFormField();

  return React.cloneElement(children, {
    id,
    name,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : undefined,
  } as React.Attributes & {
    id?: string;
    name?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  });
}

interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function FormDescription({ className, ...props }: FormDescriptionProps) {
  const { id } = useFormField();

  return (
    <p
      id={`${id}-description`}
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  message?: string;
}

export function FormMessage({ className, message, children, ...props }: FormMessageProps) {
  const { id, error } = useFormField();
  const body = message ?? error ?? children;

  if (!body) {
    return null;
  }

  return (
    <p
      id={`${id}-error`}
      className={cn("text-xs font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  );
}
