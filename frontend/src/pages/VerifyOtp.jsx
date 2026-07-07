import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { otpSchema } from '@/schemas/auth.schema.js';
import {
  useVerifyOtpMutation,
  useVerifyLoginOtpMutation,
  useResendOtpMutation,
} from '@/features/auth/authApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { ROUTES } from '@/constants';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, devCode, mode = 'signup' } = location.state || {};

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(otpSchema), defaultValues: { code: devCode || '' } });

  const [verifySignup, { isLoading: verifyingSignup }] = useVerifyOtpMutation();
  const [verifyLogin, { isLoading: verifyingLogin }] = useVerifyLoginOtpMutation();
  const [resend, { isLoading: resending }] = useResendOtpMutation();

  if (!email) return <Navigate to={ROUTES.LOGIN} replace />;

  const isLogin = mode === 'login';
  const isLoading = verifyingSignup || verifyingLogin;

  const onSubmit = async ({ code }) => {
    try {
      const mutation = isLogin ? verifyLogin : verifySignup;
      await mutation({ email, code }).unwrap();
      toast.success('Verified!');
      navigate(ROUTES.APP, { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const onResend = async () => {
    try {
      await resend({ email, purpose: isLogin ? 'login' : 'signup' }).unwrap();
      toast.success('A new code is on its way.');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <PageMeta
        title="Verify email"
        description="Enter the verification code sent to your email to complete sign in or registration."
      />
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Enter your code</h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-gray-700 dark:text-gray-200">{email}</span>.
        </p>
      </div>

      {devCode && (
        <div className="mb-5 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-900/20 dark:text-amber-300">
          Dev mode: your code is <strong>{devCode}</strong> (shown because SMTP isn&apos;t configured).
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          id="code"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          className="text-center text-2xl font-semibold tracking-[0.5em]"
          error={errors.code?.message}
          {...register('code')}
        />
        <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
          Verify
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Didn&apos;t get it?{' '}
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline disabled:opacity-50 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Resend code
        </button>
      </p>
    </>
  );
}
