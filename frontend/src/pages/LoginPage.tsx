import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { useLoginMutation } from "../services/api";
import { useAppDispatch } from "../app/hooks";
import { setCredentials } from "../features/auth/authSlice";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import { Label, Input, PasswordInput } from "../components/Field";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setVerifyEmail("");
    try {
      const res = await login({ email, password }).unwrap();
      dispatch(setCredentials({ user: res.user }));
      navigate("/");
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 403) {
        setError("Verify your email before logging in.");
        setVerifyEmail(email);
        return;
      }
      setError("Wrong email or password.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">
            <LayoutGrid size={22} />
          </span>
          <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Log in to your boards</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-line bg-surface p-6"
        >
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <Label>Password</Label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-brand hover:underline">
              Forgot password?
            </Link>
          </div>
          {error && (
            <p className="text-sm text-rose-600">
              {error}
              {verifyEmail && (
                <>
                  {" "}
                  <Link
                    to={`/verify-email?email=${encodeURIComponent(verifyEmail)}`}
                    className="font-medium text-brand hover:underline"
                  >
                    Verify now
                  </Link>
                </>
              )}
            </p>
          )}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Spinner />}
            Log in
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          New here?{" "}
          <Link
            to="/register"
            className="font-medium text-brand hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
