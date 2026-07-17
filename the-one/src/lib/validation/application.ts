import { applicationSteps, type Field, type Step } from "@/config/application-schema";
import { platformRules } from "@/config/site";
import { ageFromDob } from "@/lib/utils";

export type AnswerValue = string | number | boolean | null | undefined;
export type StepValues = Record<string, AnswerValue>;
export type FieldErrors = Record<string, string>;

function isEmpty(v: AnswerValue): boolean {
  return v === undefined || v === null || v === "" || v === false;
}

/** Validate a single field's value. Returns an error string or null. */
export function validateField(field: Field, value: AnswerValue): string | null {
  if (field.required && isEmpty(value)) {
    return field.type === "boolean" ? "This confirmation is required." : "This field is required.";
  }
  if (isEmpty(value)) return null;

  switch (field.type) {
    case "url":
      if (typeof value === "string" && !/^https?:\/\/.+/.test(value)) {
        return "Enter a valid URL (starting with http:// or https://).";
      }
      break;
    case "email":
      if (typeof value === "string" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
        return "Enter a valid email address.";
      }
      break;
    case "number":
      if (isNaN(Number(value))) return "Enter a valid number.";
      break;
    case "scale": {
      const n = Number(value);
      if (isNaN(n) || n < 1 || n > 5) return "Choose a value from 1 to 5.";
      break;
    }
  }

  // Age gate on date of birth.
  if (field.profileColumn === "date_of_birth" && typeof value === "string") {
    const age = ageFromDob(value);
    if (age === null) return "Enter a valid date.";
    if (age < platformRules.minimumAge) {
      return `You must be at least ${platformRules.minimumAge} years old to apply.`;
    }
  }

  return null;
}

/** Validate all generic fields on a step. */
export function validateStep(stepIndex: number, values: StepValues): FieldErrors {
  const step = applicationSteps.find((s) => s.index === stepIndex);
  const errors: FieldErrors = {};
  if (!step) return errors;
  for (const field of step.fields) {
    const err = validateField(field, values[field.key]);
    if (err) errors[field.key] = err;
  }
  return errors;
}

export function stepByIndex(index: number): Step | undefined {
  return applicationSteps.find((s) => s.index === index);
}

/** Percentage of required, generic fields completed across all steps. */
export function completionPercent(values: StepValues): number {
  const required: Field[] = applicationSteps.flatMap((s) => s.fields.filter((f) => f.required));
  if (required.length === 0) return 0;
  const done = required.filter((f) => !isEmpty(values[f.key])).length;
  return Math.round((done / required.length) * 100);
}
