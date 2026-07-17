import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, passwordSchema } from "@/lib/validation/auth";
import { ageFromDob } from "@/lib/utils";

describe("passwordSchema", () => {
  it("rejects weak passwords", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase1").success).toBe(false);
    expect(passwordSchema.safeParse("NoNumbersHere").success).toBe(false);
  });
  it("accepts a strong password", () => {
    expect(passwordSchema.safeParse("Str0ngPassword").success).toBe(true);
  });
});

describe("registerSchema", () => {
  const base = {
    fullName: "Test Applicant",
    email: "test@example.com",
    password: "Str0ngPassword",
    confirmPassword: "Str0ngPassword",
    acceptTerms: true as const,
  };
  it("accepts valid registration", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });
  it("requires matching passwords", () => {
    expect(
      registerSchema.safeParse({ ...base, confirmPassword: "Different1" }).success,
    ).toBe(false);
  });
  it("requires accepting terms", () => {
    expect(
      registerSchema.safeParse({ ...base, acceptTerms: false }).success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a valid email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("ageFromDob", () => {
  it("computes whole-year age", () => {
    const y = new Date().getFullYear() - 31;
    expect(ageFromDob(`${y}-01-01`)).toBeGreaterThanOrEqual(30);
  });
  it("returns null for invalid input", () => {
    expect(ageFromDob("not-a-date")).toBeNull();
  });
});
