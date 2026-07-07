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
      <PageMeta
        title="Create account"
        description="Create your workspace and start organizing team tasks in minutes."
      />
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
          Set up your organization and invite your team in minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Your name" id="name" autoComplete="name" error={errors.name?.message} {...register('name')} />
          <Input
            label="Organization"
            id="organizationName"
            placeholder="Acme Inc"
            error={errors.organizationName?.message}
            {...register('organizationName')}
          />
        </div>
        <Input
          label="Work email"
          type="email"
          id="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          id="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
          Create account
        </Button>
        <p className="text-center text-xs leading-relaxed text-gray-400 dark:text-gray-500">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <Link
          to={ROUTES.LOGIN}
          className="font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
