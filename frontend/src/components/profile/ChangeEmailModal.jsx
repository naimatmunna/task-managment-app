import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Mail, Lock } from 'lucide-react';
import {
  useRequestEmailChangeMutation,
  useVerifyEmailChangeMutation,
} from '@/features/auth/authApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import Modal from '@/components/ui/Modal.jsx';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';

const requestSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
const codeSchema = z.object({
  code: z.string().regex(/^\d{4,8}$/, 'Enter the code from your email'),
});

/**
 * Two-step email change: (1) confirm password + new email → OTP is emailed to
 * the new address; (2) enter the OTP to swap the email in. The current email
 * keeps working until step 2 succeeds.
 */
export default function ChangeEmailModal({ open, onClose, currentEmail }) {
  const [step, setStep] = useState('request');
  const [pendingEmail, setPendingEmail] = useState('');

  const [requestChange, { isLoading: requesting }] = useRequestEmailChangeMutation();
  const [verifyChange, { isLoading: verifying }] = useVerifyEmailChangeMutation();

  const requestForm = useForm({ resolver: zodResolver(requestSchema) });
  const codeForm = useForm({ resolver: zodResolver(codeSchema) });

  const reset = () => {
    setStep('request');
    setPendingEmail('');
    requestForm.reset();
    codeForm.reset();
  };

  const close = () => {
    reset();
    onClose();
  };

  const onRequest = async (values) => {
    try {
      const res = await requestChange(values).unwrap();
      setPendingEmail(res.data?.pendingEmail || values.email);
      setStep('verify');
      if (res.data?.devCode) {
        toast(`Dev code: ${res.data.devCode}`, { duration: 8000 });
      } else {
        toast.success('Verification code sent to your new email');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const onVerify = async (values) => {
    try {
      await verifyChange(values).unwrap();
      toast.success('Email updated');
      close();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <Modal open={open} onClose={close} title="Change email">
      {step === 'request' ? (
        <form onSubmit={requestForm.handleSubmit(onRequest)} className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your current email is{' '}
            <span className="font-medium text-gray-700 dark:text-gray-200">{currentEmail}</span>.
            We&apos;ll send a code to the new address to confirm it&apos;s yours.
          </p>
          <Input
            label="New email"
            id="new-email"
            type="email"
            icon={Mail}
            placeholder="you@company.com"
            autoComplete="email"
            error={requestForm.formState.errors.email?.message}
            {...requestForm.register('email')}
          />
          <Input
            label="Current password"
            id="current-password"
            type="password"
            icon={Lock}
            autoComplete="current-password"
            error={requestForm.formState.errors.password?.message}
            {...requestForm.register('password')}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" isLoading={requesting}>
              Send code
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={codeForm.handleSubmit(onVerify)} className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter the code we sent to{' '}
            <span className="font-medium text-gray-700 dark:text-gray-200">{pendingEmail}</span>.
          </p>
          <Input
            label="Verification code"
            id="email-change-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            error={codeForm.formState.errors.code?.message}
            {...codeForm.register('code')}
          />
          <div className="flex justify-between gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setStep('request')}>
              Use a different email
            </Button>
            <Button type="submit" isLoading={verifying}>
              Confirm change
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
