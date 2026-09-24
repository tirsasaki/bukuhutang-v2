"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

type FormattedNumberInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "max" | "min" | "name" | "onChange" | "type" | "value"
> & {
  max?: number;
  min?: number;
  name?: string;
  onValueChange: (value: string) => void;
  value: string;
};

export function normalizeIntegerInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/^0+(?=\d)/, "");
}

export function formatIntegerInput(value: string) {
  return normalizeIntegerInput(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function FormattedNumberInput({
  max,
  min,
  name,
  onValueChange,
  value,
  ...props
}: FormattedNumberInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const normalizedValue = normalizeIntegerInput(value);
  const numericValue = normalizedValue === "" ? null : Number(normalizedValue);
  const validationMessage =
    numericValue !== null && min !== undefined && numericValue < min
      ? `Nilai minimum ${formatIntegerInput(String(min))}.`
      : numericValue !== null && max !== undefined && numericValue > max
        ? `Nilai maksimum ${formatIntegerInput(String(max))}.`
        : "";

  React.useEffect(() => {
    inputRef.current?.setCustomValidity(validationMessage);
  }, [validationMessage]);

  return (
    <>
      <Input
        {...props}
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={formatIntegerInput(normalizedValue)}
        onChange={(event) =>
          onValueChange(normalizeIntegerInput(event.target.value))
        }
      />
      {name && <input type="hidden" name={name} value={normalizedValue} />}
    </>
  );
}
