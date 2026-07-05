import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useResetPasswordMutation } from '../services/api';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import { Label, PasswordInput } from '../components/Field';

export default function ResetPasswordPage() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') ?? '', []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) return setError('Reset token is missing.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    try {
      await resetPassword({ token, password }).unwrap();
      navigate('/login');
    } catch {
      setError('That reset link is invalid or expired.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">
            <ShieldCheck size={22} />
          </span>
          <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
          <p className="mt-1 text-sm text-muted">Your old sessions will be signed out</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
          <div>
            <Label>New password</Label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
          </div>
          <div>
            <Label>Confirm password</Label>
            <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Spinner />}
            Reset password
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          Back to{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            login
          </Link>
        </p>
      </div>
    </div>
  );
}
