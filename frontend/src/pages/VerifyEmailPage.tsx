import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { useResendVerificationMutation, useVerifyEmailMutation } from '../services/api';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import { Input, Label } from '../components/Field';

export default function VerifyEmailPage() {
  const initialEmail = useMemo(() => new URLSearchParams(window.location.search).get('email') ?? '', []);
  const emailLocked = Boolean(initialEmail);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [verifyEmail, { isLoading }] = useVerifyEmailMutation();
  const [resendVerification, { isLoading: isResending }] = useResendVerificationMutation();
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await verifyEmail({ email, otp }).unwrap();
      navigate('/login');
    } catch {
      setError('That code is invalid or expired.');
    }
  };

  const onResend = async () => {
    setError('');
    setMessage('');
    try {
      const res = await resendVerification({ email }).unwrap();
      setMessage(res.message);
    } catch {
      setError('Could not send a new code.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">
            <MailCheck size={22} />
          </span>
          <h1 className="font-display text-2xl font-semibold">Verify your email</h1>
          <p className="mt-1 text-sm text-muted">Enter the 6 digit code sent to your inbox</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={emailLocked}
              autoFocus={!email}
              className={emailLocked ? 'cursor-not-allowed bg-canvas text-muted' : ''}
            />
          </div>
          <div>
            <Label>Code</Label>
            <Input
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              autoFocus={Boolean(email)}
            />
          </div>
          {message && <p className="text-sm text-emerald-700">{message}</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Spinner />}
            Verify email
          </Button>
          <button
            type="button"
            onClick={onResend}
            disabled={!email || isResending}
            className="w-full text-sm font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:text-muted"
          >
            {isResending ? 'Sending...' : 'Send a new code'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          Already verified?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
