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
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });
  const [login, { isLoading }] = useLoginMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;

  const onSubmit = async (values) => {
    try {
      await login(values).unwrap();
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <PageMeta title="Login" />
      <h1 className="mb-6 text-2xl font-bold">Sign in</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Email" type="email" id="email" error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" id="password" error={errors.password?.message} {...register('password')} />
        <Button type="submit" isLoading={isLoading} className="w-full">
          Sign in
        </Button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link to={ROUTES.FORGOT_PASSWORD} className="text-brand-600 hover:underline">
          Forgot password?
        </Link>
        <Link to={ROUTES.REGISTER} className="text-brand-600 hover:underline">
          Create account
        </Link>
      </div>
    </>
  );
}
