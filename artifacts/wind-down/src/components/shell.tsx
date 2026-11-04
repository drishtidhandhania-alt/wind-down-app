import { Link, useLocation } from 'wouter';
import { ArrowUpRight, History, LogIn, LogOut, Moon, Settings2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser, AUTH_QUERY_KEY, logoutRequest } from '@/lib/auth-api';
import { clearActiveTesterScope } from '@/lib/tester-api';

const nav = [
  { href: '/', label: 'Tonight', icon: Moon },
  { href: '/sessions', label: 'History', icon: History },
  { href: '/setup', label: 'Setup', icon: Settings2 },
];

export function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const auth = useCurrentUser();
  const queryClient = useQueryClient();
  const [logoutError, setLogoutError] = useState('');

  const logout = async () => {
    setLogoutError('');
    try {
      await logoutRequest();
      clearActiveTesterScope();
      queryClient.clear();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      setLocation('/');
    } catch {
      setLogoutError('Could not sign out. Please try again.');
    }
  };

  return (
    <div className="app-shell">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-6 sm:px-8 sm:pt-9">
        <Link href="/" className="group flex shrink-0 items-center gap-3 rounded-full text-inherit no-underline" data-testid="link-home">
          <span className="grid size-10 place-items-center rounded-full border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.08)] text-[hsl(var(--primary))]">
            <Moon size={17} strokeWidth={1.8} />
          </span>
          <span className="font-display whitespace-nowrap text-[1.22rem] tracking-[-.03em]">wind down</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <nav className="flex shrink-0 items-center gap-1 rounded-full border border-[hsl(var(--card-border)/.55)] bg-[hsl(var(--card))] p-1" aria-label="Main navigation">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                title={label}
                data-testid={`link-nav-${label.toLowerCase()}`}
                className={`flex min-h-10 items-center gap-1.5 rounded-full px-2 text-xs no-underline transition-colors duration-200 sm:gap-2 sm:px-4 sm:text-sm ${
                  location === href ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <Icon size={15} />
                <span className="hidden min-[480px]:inline">{label}</span>
              </Link>
            ))}
          </nav>
          {auth.data ? (
            <button
              type="button"
              onClick={logout}
              aria-label="Log out"
              title="Log out"
              className="grid size-10 shrink-0 place-items-center rounded-full text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] sm:flex sm:w-auto sm:gap-2 sm:px-3 sm:text-sm"
              data-testid="button-logout"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          ) : (
            <Link
              href="/login"
              aria-label="Log in"
              title="Log in"
              className="grid size-10 shrink-0 place-items-center rounded-full text-[hsl(var(--muted-foreground))] no-underline hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] sm:flex sm:w-auto sm:gap-2 sm:px-3 sm:text-sm"
              data-testid="link-login"
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">Log in</span>
            </Link>
          )}
        </div>
      </header>
      {logoutError && <p className="mx-auto mt-3 max-w-5xl px-5 text-right text-xs text-[hsl(var(--destructive))]" role="alert">{logoutError}</p>}
      <main className="mx-auto w-full max-w-5xl px-5 pb-12 pt-8 sm:px-8 sm:pt-12">{children}</main>
      <footer className="mx-auto flex max-w-5xl items-center justify-between px-5 pb-8 text-xs text-[hsl(var(--muted-foreground))] sm:px-8">
        <span>A small pause, just for you.</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[hsl(var(--success))]" /> Private by design</span>
      </footer>
    </div>
  );
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:mb-10 sm:flex-row sm:items-end">
      <div>
        <p className="mb-3 font-mono text-xs font-medium text-[hsl(var(--accent))]">{eyebrow}</p>
        <h1 className="font-display text-4xl leading-[1.15] tracking-[-.025em] text-[hsl(var(--foreground))] sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-xl text-base leading-[1.6] text-[hsl(var(--muted-foreground))]">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function QuietLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--primary))] no-underline transition-colors hover:text-[hsl(var(--foreground))]">{children}<ArrowUpRight size={15} /></Link>;
}
