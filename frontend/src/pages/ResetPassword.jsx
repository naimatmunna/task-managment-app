import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resetPasswordSchema } from '@/schemas/auth.schema.js';
import { useResetPasswordMutation } from '@/features/auth/authApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { ROUTES } from '@/constants';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const presetEmail = location.state?.email || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(resetPasswordSchema) });
  const [reset, { isLoading }] = useResetPasswordMutation();

  const onSubmit = async ({ code, password }) => {
    try {
      await reset({ email: presetEmail, code, password }).unwrap();
      toast.success('Password reset. Please sign in.');
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  if (!presetEmail) {
    return (
      <p className="text-center text-sm text-red-600">
        Start from the{' '}
        <Link to={ROUTES.FORGOT_PASSWORD} className="text-brand-600 hover:underline">
          forgot password
        </Link>{' '}
        page to receive a code.
      </p>
    );
  }

  return (
    <>
      <PageMeta title="Set new password" />
      <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">
        Enter the code sent to <span className="font-medium">{presetEmail}</span> and a new password.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Reset code" id="code" inputMode="numeric" maxLength={6} placeholder="000000" error={errors.code?.message} {...register('code')} />
        <Input label="New password" type="password" id="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
        <Button type="submit" isLoading={isLoading} className="w-full">
          Reset password
        </Button>
      </form>
      <p className="mt-5 text-center text-sm">
        <Link to={ROUTES.LOGIN} className="text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
