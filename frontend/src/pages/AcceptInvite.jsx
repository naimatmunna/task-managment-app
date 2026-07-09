import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePeekInviteQuery, useAcceptInviteMutation } from '@/features/org/orgApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { ROUTES } from '@/constants';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';

const schema = z.object({
  name: z.string().min(2, 'Name is too short'),
  password: z.string().min(8, 'At least 8 characters'),
});

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();

  const { data: invite, isLoading, isError, error } = usePeekInviteQuery(token, { skip: !token });
  const [accept, { isLoading: accepting }] = useAcceptInviteMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const doAccept = async (body) => {
    try {
      await accept({ token, ...body }).unwrap();
      toast.success('Welcome to the team!');
      navigate(ROUTES.APP, { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  if (!token) {
    return <p className="text-center text-sm text-red-600">This invite link is missing its token.</p>;
  }
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }
  if (isError) {
    // Prefer the server's message (e.g. "invalid" vs "expired"). Only when the
    // request never reached the API (network/proxy/404, no JSON body) do we show
    // a generic load error — NOT a misleading "expired" claim.
    const serverMessage = error?.data?.message;
    const message =
      serverMessage ||
      (typeof error?.status === 'number'
        ? `Couldn't load this invitation (error ${error.status}). Check the link or try again.`
        : "Couldn't reach the server. Please check your connection and try again.");
    return (
      <div className="text-center">
        <p className="text-sm text-red-600">{message}</p>
        <Link to={ROUTES.LOGIN} className="mt-4 inline-block text-sm text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Accept invite" />
      <h1 className="text-2xl font-bold tracking-tight">Join {invite.organizationName}</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">
        Invitation for <span className="font-medium text-gray-700 dark:text-gray-200">{invite.email}</span>
      </p>

      {invite.needsProfile ? (
        <form onSubmit={handleSubmit(doAccept)} className="space-y-4">
          <Input label="Your name" id="name" autoComplete="name" error={errors.name?.message} {...register('name')} />
          <Input label="Create a password" type="password" id="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
          <Button type="submit" isLoading={accepting} className="w-full">
            Accept & join
          </Button>
        </form>
      ) : (
        <Button onClick={() => doAccept({})} isLoading={accepting} className="w-full">
          Accept invitation
        </Button>
      )}
      <p className="mt-5 text-center text-sm">
        <Link to={ROUTES.LOGIN} className="text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
