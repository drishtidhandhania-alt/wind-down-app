import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import HomePage from '@/pages/home';
import PausePage from '@/pages/pause';
import RoutinePage from '@/pages/routine';
import SetupPage from '@/pages/setup';
import SessionHistoryPage from '@/pages/sessions';
import SessionDetailPage from '@/pages/session-detail';
import { EditSessionPage, NewSessionPage } from '@/pages/session-form';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Shell } from '@/components/shell';
import AuthPage from '@/pages/auth';
import { useCurrentUser } from '@/lib/auth-api';
import { activateTesterScope, clearActiveTesterScope } from '@/lib/tester-api';
import { useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, staleTime: 15_000 },
  },
});

function Router() {
  return (
    <RoutedErrorBoundary>
      <Shell>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/pause" component={PausePage} />
          <Route path="/routine" component={RoutinePage} />
          <Route path="/setup">
            <RequireAuth><SetupPage /></RequireAuth>
          </Route>
          <Route path="/sessions">
            <RequireAuth><SessionHistoryPage /></RequireAuth>
          </Route>
          <Route path="/sessions/new">
            <RequireAuth><NewSessionPage /></RequireAuth>
          </Route>
          <Route path="/sessions/:sessionId/edit">
            <RequireAuth><EditSessionPage /></RequireAuth>
          </Route>
          <Route path="/sessions/:sessionId">
            <RequireAuth><SessionDetailPage /></RequireAuth>
          </Route>
          <Route path="/login"><AuthPage /></Route>
          <Route path="/signup"><AuthPage /></Route>
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </RoutedErrorBoundary>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useCurrentUser();
  const [location] = useLocation();

  if (auth.isLoading) {
    return <div className="page-enter mx-auto max-w-xl py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">Checking your account…</div>;
  }
  if (auth.isError) {
    return <div className="page-enter mx-auto max-w-xl py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">We couldn’t check your account. Refresh the page and try again.</div>;
  }
  if (!auth.data) {
    return <Redirect to={`/login?next=${encodeURIComponent(location)}`} />;
  }
  return children;
}

function AuthSessionSync() {
  const auth = useCurrentUser();
  useEffect(() => {
    if (!auth.isSuccess) return;
    if (auth.data) activateTesterScope(auth.data.id);
    else clearActiveTesterScope();
  }, [auth.data, auth.isSuccess]);
  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthSessionSync />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
