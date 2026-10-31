import { z } from "zod";

import { PASSWORD_REGEX, USER_ROLES } from "@/lib/constants";

export const passwordField = z
  .string()
  .regex(
    PASSWORD_REGEX,
    "Password must be at least 9 chars and include uppercase, lowercase, and special character"
  );

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: passwordField,
  company: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, "Reset token is required"),
    password: passwordField,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const createStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: passwordField,
});

export const updateUserSchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(USER_ROLES).optional(),
});
