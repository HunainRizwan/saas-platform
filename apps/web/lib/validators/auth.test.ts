import { describe, it, expect } from "vitest";
import { signupSchema, loginSchema, forgotPasswordSchema } from "@/lib/validators/auth";

describe("signupSchema", () => {
  it("accepts a valid signup payload", () => {
    const result = signupSchema.safeParse({
      fullName: "Ali Khan",
      email: "ali@example.com",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = signupSchema.safeParse({
      fullName: "Ali Khan",
      email: "ali@example.com",
      password: "password123",
      confirmPassword: "different123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no digit", () => {
    const result = signupSchema.safeParse({
      fullName: "Ali Khan",
      email: "ali@example.com",
      password: "passwordonly",
      confirmPassword: "passwordonly",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({
      fullName: "Ali Khan",
      email: "not-an-email",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials shape", () => {
    const result = loginSchema.safeParse({ email: "ali@example.com", password: "anything" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "ali@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "ali@example.com" }).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});
