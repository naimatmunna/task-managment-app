import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registerSchema } from '@/schemas/auth.schema.js';
import { useRegisterMutation } from '@/features/auth/authApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { ROUTES } from '@/constants';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';

export default function Register() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  });
  const [registerUser, { isLoading }] = useRegisterMutation();
  const navigate = useNavigate();

  const onSubmit = async (values) => {
    try {
      await registerUser(values).unwrap();
      toast.success('Account created — please sign in');
      navigate(ROUTES.LOGIN);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <PageMeta title="Register" />
      <h1 className="mb-6 text-2xl font-bold">Create account</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name" id="name" error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" id="email" error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" id="password" error={errors.password?.message} {...register('password')} />
        <Button type="submit" isLoading={isLoading} className="w-full">
          Sign up
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
