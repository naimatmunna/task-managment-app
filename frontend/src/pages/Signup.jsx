import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { signupSchema } from '@/schemas/auth.schema.js';
import { useSignupMutation } from '@/features/auth/authApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { ROUTES } from '@/constants';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';

export default function Signup() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(signupSchema) });
  const [signup, { isLoading }] = useSignupMutation();
  const navigate = useNavigate();

  const onSubmit = async (values) => {
    try {
      const res = await signup(values).unwrap();
      toast.success('Check your email for a verification code.');
      navigate(ROUTES.VERIFY_OTP, {
        state: { email: values.email, devCode: res.data?.devCode, mode: 'signup' },
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <PageMeta title="Create account" />
      <h1 className="text-2xl font-bold tracking-tight">Create your workspace</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">
        Start managing your team&apos;s work in minutes.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Your name" id="name" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <Input
          label="Organization name"
          id="organizationName"
          placeholder="Acme Inc"
          error={errors.organizationName?.message}
          {...register('organizationName')}
        />
        <Input label="Work email" type="email" id="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Password"
          type="password"
          id="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" isLoading={isLoading} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
