import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useForgotPasswordMutation } from '../services/api';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import { Input, Label } from '../components/Field';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await forgotPassword({ email }).unwrap();
      setMessage(res.message);
    } catch {
      setError('Could not send a reset link.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">
            <KeyRound size={22} />
          </span>
          <h1 className="font-display text-2xl font-semibold">Reset your password</h1>
          <p className="mt-1 text-sm text-muted">We will send a reset link if the account exists</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          {message && <p className="text-sm text-emerald-700">{message}</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Spinner />}
            Send reset link
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
