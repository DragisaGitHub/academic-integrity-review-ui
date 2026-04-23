import { Navigate, Outlet, useLocation } from 'react-router';
import { getDefaultRouteForRole } from '../routeAccess';
import type { UserRole } from '../types';
import { useAuth } from './AuthContext';

export function RequireRole({ role }: { role: UserRole }) {
  const location = useLocation();
  const { currentUser, isInitializing } = useAuth();

  if (isInitializing) {
    return null;
  }

  if (!currentUser || currentUser.role !== role) {
    return <Navigate to={getDefaultRouteForRole(currentUser?.role ?? 'USER')} replace />;
  }

  if (
    role === 'USER' &&
    currentUser.settingsCompleted === false &&
    location.pathname !== '/settings'
  ) {
    return <Navigate to="/settings" replace />;
  }

  return <Outlet />;
}

export function RequireAdminRole() {
  return <RequireRole role="ADMIN" />;
}

export function RequireUserRole() {
  return <RequireRole role="USER" />;
}