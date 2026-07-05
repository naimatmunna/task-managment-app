import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginSchema } from '@/schemas/auth.schema.js';
import { useLoginMutation } from '@/features/auth/authApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { ROUTES } from '@/constants';
import Input from '@/components/ui/Input.jsx';
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
      // Optional second-factor path.
      if (res.data?.otpRequired) {
        navigate(ROUTES.VERIFY_OTP, {
          state: { email: res.data.email, devCode: res.data.devCode, mode: 'login' },
        });
        return;
      }
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      // Unverified accounts are routed to the OTP screen.
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
      <PageMeta title="Sign in" />
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">
        Sign in to your PropVia workspace.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Email" type="email" id="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Password"
          type="password"
          id="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" isLoading={isLoading} className="w-full">
          Sign in
        </Button>
      </form>
      <div className="mt-5 flex justify-between text-sm">
        <Link to={ROUTES.FORGOT_PASSWORD} className="text-brand-600 hover:underline">
          Forgot password?
        </Link>
        <Link to={ROUTES.SIGNUP} className="text-brand-600 hover:underline">
          Create account
        </Link>
      </div>
    </>
  );
}
