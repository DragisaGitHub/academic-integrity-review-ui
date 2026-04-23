import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { LogIn } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../auth/AuthContext';
import { HttpError } from '../api';
import { getDefaultAuthenticatedRoute, isPathAllowedForRole } from '../routeAccess';
import type { AppUser } from '../types';

type LocationState = {
  from?: {
    pathname?: string;
    search?: string;
  };
};

function resolvePostLoginDestination(state: LocationState | null, roleAwareFallback: string): string {
  if (state?.from?.pathname) {
    return `${state.from.pathname}${state.from.search ?? ''}`;
  }

  return roleAwareFallback;
}

function resolveSafePostLoginDestination(state: LocationState | null, user: AppUser): string {
  const roleAwareFallback = getDefaultAuthenticatedRoute(user);

  if (user.role === 'USER' && user.settingsCompleted === false) {
    return roleAwareFallback;
  }

  const candidate = resolvePostLoginDestination(state, roleAwareFallback);

  if (!isPathAllowedForRole(candidate, user.role)) {
    return roleAwareFallback;
  }

  return candidate;
}

export function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, isInitializing, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const state = location.state as LocationState | null;
  const redirectTo = currentUser
    ? resolveSafePostLoginDestination(state, currentUser)
    : '/';

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      return;
    }

    navigate(redirectTo, { replace: true });
  }, [currentUser, isAuthenticated, navigate, redirectTo]);

  if (!isInitializing && isAuthenticated && currentUser) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setErrorMessage('Enter both username and password.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login({ username: trimmedUsername, password });
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        setErrorMessage('Invalid username or password.');
      } else {
        setErrorMessage('Could not sign in. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl tracking-tight">Academic Integrity Review</CardTitle>
          <CardDescription>Sign in to access the review workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
            </div>
            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}