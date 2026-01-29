"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormCheckboxProps {
  name: string;
  label: string;
  description?: string;
  error?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  containerClassName?: string;
}

export function FormCheckbox({
  name,
  label,
  description,
  error,
  checked,
  onCheckedChange,
  disabled,
  containerClassName,
}: FormCheckboxProps) {
  const id = React.useId();

  return (
    <div className={cn("space-y-2", containerClassName)}>
      <div className="flex items-start space-x-3">
        <Checkbox
          id={id}
          name={name}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-invalid={!!error}
          className={cn(error && "border-destructive")}
        />
        <div className="grid gap-1.5 leading-none">
          <Label
            htmlFor={id}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              error && "text-destructive"
            )}
          >
            {label}
          </Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
