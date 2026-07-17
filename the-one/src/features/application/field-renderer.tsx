"use client";

import { Lock } from "lucide-react";
import type { Field } from "@/config/application-schema";
import type { AnswerValue } from "@/lib/validation/application";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  field: Field;
  value: AnswerValue;
  error?: string;
  disabled?: boolean;
  onChange: (key: string, value: AnswerValue) => void;
}

export function FieldRenderer({ field, value, error, disabled, onChange }: Props) {
  const id = `field-${field.key}`;
  const describedBy =
    [error ? `${id}-error` : null, field.help ? `${id}-help` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const common = {
    id,
    disabled,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy,
  };

  return (
    <div className="space-y-2">
      {field.type !== "boolean" ? (
        <Label htmlFor={id}>
          {field.label}
          {field.required ? <span className="ml-1 text-burgundy">*</span> : null}
        </Label>
      ) : null}

      {field.type === "textarea" ? (
        <Textarea
          {...common}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
        />
      ) : field.type === "select" ? (
        <select
          {...common}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={cn(
            "flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
          )}
        >
          <option value="">Select…</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : field.type === "scale" ? (
        <div role="radiogroup" aria-label={field.label} className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={Number(value) === n}
              disabled={disabled}
              onClick={() => onChange(field.key, n)}
              className={cn(
                "h-11 w-11 rounded-md border text-sm transition-colors",
                Number(value) === n
                  ? "border-gold bg-gold text-ink"
                  : "border-input hover:bg-secondary",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      ) : field.type === "boolean" ? (
        <label htmlFor={id} className="flex items-start gap-3">
          <input
            id={id}
            type="checkbox"
            disabled={disabled}
            checked={Boolean(value)}
            aria-describedby={describedBy}
            onChange={(e) => onChange(field.key, e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-input text-gold focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-sm text-muted-foreground">
            {field.label}
            {field.required ? <span className="ml-1 text-burgundy">*</span> : null}
          </span>
        </label>
      ) : (
        <Input
          {...common}
          type={field.type === "number" ? "number" : field.type === "tel" ? "tel" : field.type === "url" ? "url" : field.type === "date" ? "date" : "text"}
          value={(value as string | number) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
        />
      )}

      {field.help ? (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {field.sensitive ? <Lock className="mr-1 inline h-3 w-3" /> : null}
          {field.help}
        </p>
      ) : null}
      {field.sensitive && !field.help ? (
        <p className="text-xs text-muted-foreground">
          <Lock className="mr-1 inline h-3 w-3" />
          Sensitive information — kept private.
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
