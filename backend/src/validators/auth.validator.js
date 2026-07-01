import { z } from 'zod';

const password = z.string().min(8, 'Password must be at least 8 characters').max(128);
const email = z.string().email().toLowerCase();

export const registerSchema = {
  body: z.object({
    name: z.string().min(2).max(120),
    email,
    password,
  }),
};

export const loginSchema = {
  body: z.object({ email, password: z.string().min(1) }),
};

export const forgotPasswordSchema = {
  body: z.object({ email }),
};

export const resetPasswordSchema = {
  body: z.object({ token: z.string().min(10), password }),
};

export const verifyEmailSchema = {
  body: z.object({ token: z.string().min(10) }),
};

export const changePasswordSchema = {
  body: z.object({ currentPassword: z.string().min(1), newPassword: password }),
};
