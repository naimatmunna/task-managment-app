import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail } from 'lucide-react';
import { loginSchema } from '@/schemas/auth.schema.js';
import { useLoginMutation } from '@/features/auth/authApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { ROUTES } from '@/constants';
import Input from '@/components/ui/Input.jsx';
import PasswordInput from '@/components/ui/PasswordInput.jsx';
import Button from '@/components/ui/Button.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });
  const [login, { isLoading }] = useLoginMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || ROUTES.APP;

  const onSubmit = async (values) => {
    try {
      const res = await login(values).unwrap();
      if (res.data?.otpRequired) {
        navigate(ROUTES.VERIFY_OTP, {
          state: { email: res.data.email, devCode: res.data.devCode, mode: 'login' },
        });
        return;
      }
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      if (err?.data?.code === 'EMAIL_NOT_VERIFIED') {
        toast('Verify your email to continue.', { icon: '✉️' });
        navigate(ROUTES.VERIFY_OTP, {
          state: {
            email: err.data.details?.email || values.email,
            devCode: err.data.details?.devCode,
            mode: 'signup',
          },
        });
        return;
      }
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <PageMeta
        title="Sign in"
        description="Sign in to your workspace to manage tasks, boards, and team projects."
      />
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
          Sign in to continue to your workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email"
          type="email"
          id="email"
          icon={Mail}
          placeholder="you@company.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>
        <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Don&apos;t have an account?{' '}
        <Link
          to={ROUTES.SIGNUP}
          className="font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
        >
          Create one
        </Link>
      </p>
    </>
  );
}
