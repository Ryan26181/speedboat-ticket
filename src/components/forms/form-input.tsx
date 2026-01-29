"use client";

import * as React from "react";
import { Input, type InputProps } from "@/components/ui/input";
import {
  FormField,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "./form-field";

interface FormInputProps extends Omit<InputProps, "name" | "error"> {
  name: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
}

export function FormInput({
  name,
  label,
  description,
  error,
  required,
  containerClassName,
  className,
  ...props
}: FormInputProps) {
  return (
    <FormField name={name} error={error} className={containerClassName}>
      <FormLabel required={required}>{label}</FormLabel>
      <FormControl>
        <Input error={!!error} className={className} {...props} />
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormField>
  );
}
