"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormField,
  FormLabel,
  FormDescription,
  FormMessage,
} from "./form-field";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FormSelectProps {
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  containerClassName?: string;
  className?: string;
}

export function FormSelect({
  name,
  label,
  placeholder = "Select an option",
  description,
  error,
  required,
  disabled,
  options,
  value,
  onValueChange,
  containerClassName,
  className,
}: FormSelectProps) {
  return (
    <FormField name={name} error={error} className={containerClassName}>
      <FormLabel required={required}>{label}</FormLabel>
      <Select
        name={name}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(error && "border-destructive", className)}
          aria-invalid={!!error}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormField>
  );
}
