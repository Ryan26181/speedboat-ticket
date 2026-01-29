"use client";

import * as React from "react";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import {
  FormField,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "./form-field";

interface FormTextareaProps extends Omit<TextareaProps, "name" | "error"> {
  name: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
}

export function FormTextarea({
  name,
  label,
  description,
  error,
  required,
  containerClassName,
  className,
  ...props
}: FormTextareaProps) {
  return (
    <FormField name={name} error={error} className={containerClassName}>
      <FormLabel required={required}>{label}</FormLabel>
      <FormControl>
        <Textarea error={!!error} className={className} {...props} />
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormField>
  );
}
