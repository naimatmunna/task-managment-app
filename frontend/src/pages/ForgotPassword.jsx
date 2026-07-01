import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { forgotPasswordSchema } from '@/schemas/auth.schema.js';
import { useForgotPasswordMutation } from '@/features/auth/authApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { ROUTES } from '@/constants';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';

export default function ForgotPassword() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });
  const [forgot, { isLoading, isSuccess }] = useForgotPasswordMutation();

  const onSubmit = async (values) => {
    try {
      await forgot(values).unwrap();
      toast.success('If the account exists, a reset link was sent');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <PageMeta title="Forgot password" />
      <h1 className="mb-6 text-2xl font-bold">Reset your password</h1>
      {isSuccess ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Check your inbox for a reset link.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Email" type="email" id="email" error={errors.email?.message} {...register('email')} />
          <Button type="submit" isLoading={isLoading} className="w-full">
            Send reset link
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm">
        <Link to={ROUTES.LOGIN} className="text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
