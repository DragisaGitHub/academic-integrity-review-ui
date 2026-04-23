import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { configureHttpAuthHandlers, HttpError } from '../api';
import { getDefaultAuthenticatedRoute } from '../routeAccess';
import { changeOwnPasswordToApi, getCurrentUserFromApi, loginToApi } from '../services/auth';
import { getUserSettingsBootstrapFromApi, resetAppSettings } from '../services/settings';
import type { AppUser, ChangePasswordRequest, LoginRequest } from '../types';

const AUTH_TOKEN_STORAGE_KEY = 'academic-integrity-review-ui.auth-token';

type AuthContextValue = {
  accessToken: string | null;
  currentUser: AppUser | null;
  isInitializing: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (request: LoginRequest) => Promise<AppUser>;
  logout: () => void;
  refreshCurrentUser: () => Promise<void>;
  markSettingsCompleted: () => void;
  changeOwnPassword: (request: ChangePasswordRequest) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function persistAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return;

  if (!token) {
    window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

function clearPersistedSession(): void {
  persistAccessToken(null);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => getStoredAccessToken());
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  function clearSessionState(userId?: string | null): void {
    clearPersistedSession();
    resetAppSettings(userId ?? undefined);
  }

  useEffect(() => {
    configureHttpAuthHandlers({
      getAccessToken: () => accessToken,
      onUnauthorized: () => {
        const activeUserId = currentUser?.id;
        setAccessToken(null);
        setCurrentUser(null);
        clearSessionState(activeUserId);

        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          toast.error('Session expired. Please log in again.');
          window.location.replace('/login');
        }
      },
    });
  }, [accessToken, currentUser?.id]);

  async function resolveBootstrappedUser(user: AppUser): Promise<AppUser> {
    if (user.role !== 'USER') {
      return user;
    }

    const { settingsCompleted } = await getUserSettingsBootstrapFromApi(user);
    return { ...user, settingsCompleted };
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      if (!accessToken) {
        setCurrentUser(null);
        setIsInitializing(false);
        return;
      }

      setIsInitializing(true);

      try {
        const user = await getCurrentUserFromApi();
        if (cancelled) return;

        const nextUser = await resolveBootstrappedUser(user);
        if (cancelled) return;

        setCurrentUser(nextUser);
      } catch (error) {
        if (cancelled) return;

        if (!(error instanceof HttpError && error.status === 401)) {
          toast.error('Could not load your current session.');
        }

        const activeUserId = currentUser?.id;
        setAccessToken(null);
        setCurrentUser(null);
        clearSessionState(activeUserId);
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  async function login(request: LoginRequest): Promise<AppUser> {
    const response = await loginToApi(request);
    persistAccessToken(response.token);
    setIsInitializing(true);
    setCurrentUser(null);
    setAccessToken(response.token);
    return response.user;
  }

  function logout(): void {
    const activeUserId = currentUser?.id;
    clearPersistedSession();
    setAccessToken(null);
    setCurrentUser(null);
    resetAppSettings(activeUserId);
  }

  async function refreshCurrentUser(): Promise<void> {
    if (!accessToken) {
      setCurrentUser(null);
      return;
    }

    const user = await getCurrentUserFromApi();
    const nextUser = await resolveBootstrappedUser(user);
    setCurrentUser(nextUser);
  }

  function markSettingsCompleted(): void {
    setCurrentUser((previous) => {
      if (!previous || previous.role !== 'USER') {
        return previous;
      }

      return {
        ...previous,
        settingsCompleted: true,
      };
    });
  }

  async function changeOwnPassword(request: ChangePasswordRequest): Promise<void> {
    await changeOwnPasswordToApi(request);
  }

  const value = useMemo<AuthContextValue>(() => ({
    accessToken,
    currentUser,
    isInitializing,
    isAuthenticated: Boolean(accessToken && currentUser),
    isAdmin: currentUser?.role === 'ADMIN',
    login,
    logout,
    refreshCurrentUser,
    markSettingsCompleted,
    changeOwnPassword,
  }), [accessToken, currentUser, isInitializing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}