import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resetPasswordSchema } from '@/schemas/auth.schema.js';
import { useResetPasswordMutation } from '@/features/auth/authApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { ROUTES } from '@/constants';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });
  const [reset, { isLoading }] = useResetPasswordMutation();

  const onSubmit = async (values) => {
    try {
      await reset({ token, password: values.password }).unwrap();
      toast.success('Password reset — please sign in');
      navigate(ROUTES.LOGIN);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  if (!token) {
    return (
      <p className="text-center text-sm text-red-600">
        Invalid or missing reset token.{' '}
        <Link to={ROUTES.FORGOT_PASSWORD} className="text-brand-600 hover:underline">
          Request a new one
        </Link>
      </p>
    );
  }

  return (
    <>
      <PageMeta title="Reset password" />
      <h1 className="mb-6 text-2xl font-bold">Set a new password</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="New password" type="password" id="password" error={errors.password?.message} {...register('password')} />
        <Button type="submit" isLoading={isLoading} className="w-full">
          Reset password
        </Button>
      </form>
    </>
  );
}
