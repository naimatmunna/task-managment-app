import { z } from 'zod';
import { OTP_PURPOSE_VALUES } from '../constants/otp.js';

const password = z.string().min(8, 'Password must be at least 8 characters').max(128);
const email = z.string().email().toLowerCase();
const code = z.string().regex(/^\d{4,8}$/, 'Enter the numeric code from your email');

export const signupSchema = {
  body: z.object({
    name: z.string().min(2).max(120),
    email,
    password,
    organizationName: z.string().min(2, 'Organization name is required').max(120),
  }),
};

export const verifyOtpSchema = {
  body: z.object({ email, code }),
};

export const resendOtpSchema = {
  body: z.object({
    email,
    purpose: z.enum(OTP_PURPOSE_VALUES).optional(),
  }),
};

export const loginSchema = {
  body: z.object({ email, password: z.string().min(1) }),
};

export const forgotPasswordSchema = {
  body: z.object({ email }),
};

export const resetPasswordSchema = {
  body: z.object({ email, code, password }),
};

export const changePasswordSchema = {
  body: z.object({ currentPassword: z.string().min(1), newPassword: password }),
};

export const updateProfileSchema = {
  body: z.object({
    name: z.string().min(2, 'Name is too short').max(120).optional(),
    avatarUrl: z.union([z.string().url('Enter a valid image URL'), z.literal(''), z.null()]).optional(),
  }),
};
