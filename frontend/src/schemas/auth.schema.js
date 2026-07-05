import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  organizationName: z.string().min(2, 'Organization name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
});

export const otpSchema = z.object({
  code: z.string().regex(/^\d{4,8}$/, 'Enter the code from your email'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

export const resetPasswordSchema = z.object({
  code: z.string().regex(/^\d{4,8}$/, 'Enter the code from your email'),
  password: z.string().min(8, 'At least 8 characters'),
});
