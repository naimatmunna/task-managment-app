import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { forgotPasswordSchema } from '@/schemas/auth.schema.js';
import { useForgotPasswordMutation } from '@/features/auth/authApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { ROUTES } from '@/constants';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';

export default function ForgotPassword() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema) });
  const [forgot, { isLoading }] = useForgotPasswordMutation();
  const navigate = useNavigate();

  const onSubmit = async ({ email }) => {
    try {
      await forgot({ email }).unwrap();
      toast.success('If that account exists, a reset code has been sent.');
      navigate(ROUTES.RESET_PASSWORD, { state: { email } });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <PageMeta
        title="Reset password"
        description="Reset your password using the verification code sent to your email."
      />
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Forgot password?</h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
          Enter your email and we&apos;ll send you a reset code.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email"
          type="email"
          id="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
          Send reset code
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <Link
          to={ROUTES.LOGIN}
          className="font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
        >
          Back to sign in
        </Link>
      </p>
    </>
  );
}
