import { FormEvent, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { LoaderCircle, Moon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeading } from '@/components/shell';
import { AUTH_QUERY_KEY, submitAuth, useCurrentUser } from '@/lib/auth-api';
import { activateTesterScope } from '@/lib/tester-api';

type AuthFieldErrors = Partial<Record<'email' | 'password', string>>;

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();
  const auth = useCurrentUser();
  const isSignup = location.startsWith('/signup');

  const finishPath = () => {
    const requested = new URLSearchParams(window.location.search).get('next');
    return requested?.startsWith('/') && !requested.startsWith('//')
      ? requested
      : '/';
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const emailInput = event.currentTarget.elements.namedItem('email') as HTMLInputElement | null;
    const nextFieldErrors: AuthFieldErrors = {};
    if (!email.trim()) {
      nextFieldErrors.email = 'Enter your email address to continue.';
    } else if (emailInput?.validity.typeMismatch) {
      nextFieldErrors.email = 'Enter an email address in the usual format.';
    }
    if (!password) {
      nextFieldErrors.password = 'Enter your password to continue.';
    } else if (isSignup && password.length < 10) {
      nextFieldErrors.password = 'Use at least 10 characters for your password.';
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    setPending(true);
    try {
      const user = await submitAuth(
        isSignup ? 'signup' : 'login',
        email,
        password,
      );
      activateTesterScope(user.id);
      queryClient.clear();
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      setLocation(finishPath());
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to sign in right now.',
      );
    } finally {
      setPending(false);
    }
  };

  if (auth.data) {
    return (
      <div className="page-enter mx-auto max-w-xl">
        <section className="rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-7 text-center sm:p-10">
          <h1 className="font-display text-4xl tracking-[-.025em]">You’re signed in.</h1>
          <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">{auth.data.email}</p>
          <Link href="/" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[hsl(var(--primary))] px-6 font-semibold text-[hsl(var(--primary-foreground))] no-underline">Continue to Wind Down</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page-enter mx-auto max-w-xl">
      <PageHeading
        eyebrow="Your private space"
        title={isSignup ? 'Create your account.' : 'Welcome back.'}
        description={
          isSignup
            ? 'Your settings and Wind Down sessions will be kept with your account.'
            : 'Sign in to return to your Wind Down settings.'
        }
      />
      <section className="rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-6 sm:p-9">
        <div className="mb-6 flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
          <span className="grid size-10 place-items-center rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><Moon size={18} /></span>
          <span>Only your account can access your Wind Down data.</span>
        </div>
        <form noValidate onSubmit={submit} className="space-y-5">
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                if (event.target.value.trim()) {
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                }
              }}
              className="mt-2 block min-h-12 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.65)] px-4 text-base text-[hsl(var(--foreground))]"
              data-testid="input-auth-email"
            />
            {fieldErrors.email && <span id="auth-email-error" className="mt-1 block text-sm font-normal text-[hsl(var(--destructive))]" role="alert">{fieldErrors.email}</span>}
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              type="password"
              name="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              minLength={isSignup ? 10 : 1}
              maxLength={1024}
              value={password}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                  if (event.target.value && (!isSignup || event.target.value.length >= 10)) {
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                }
              }}
              className="mt-2 block min-h-12 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.65)] px-4 text-base text-[hsl(var(--foreground))]"
              data-testid="input-auth-password"
            />
            {fieldErrors.password && <span id="auth-password-error" className="mt-1 block text-sm font-normal text-[hsl(var(--destructive))]" role="alert">{fieldErrors.password}</span>}
            {isSignup && <span className="mt-2 block text-xs text-[hsl(var(--muted-foreground))]">Use at least 10 characters.</span>}
          </label>
          {error && <p className="text-sm text-[hsl(var(--destructive))]" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 text-base font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60"
            data-testid="button-auth-submit"
          >
            {pending && <LoaderCircle size={18} className="animate-spin" />}
            {pending ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
          {isSignup ? 'Already have an account?' : 'New to Wind Down?'}{' '}
          <Link
            href={isSignup ? '/login' : '/signup'}
            className="font-medium text-[hsl(var(--primary))] underline underline-offset-4"
          >
            {isSignup ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </section>
    </div>
  );
}
