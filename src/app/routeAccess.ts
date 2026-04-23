import type { AppUser, UserRole } from './types';

export const DEFAULT_USER_ROUTE = '/';
export const DEFAULT_ADMIN_ROUTE = '/admin/users';
export const ANALYSES_ROUTE = '/analyses';

export function getAnalysisDetailRoute(documentId: string): string {
  return `${ANALYSES_ROUTE}/${encodeURIComponent(documentId)}`;
}

export type UserShellRoute =
  | '/'
  | '/upload'
  | '/analyses'
  | '/analyses/:documentId'
  | '/review-notes/:documentId'
  | '/history'
  | '/settings';

export type AdminShellRoute = '/admin/users';

type RouteMatcher = (pathname: string) => boolean;

const userRouteMatchers: RouteMatcher[] = [
  (pathname) => pathname === DEFAULT_USER_ROUTE,
  (pathname) => pathname === '/upload',
  (pathname) => pathname === ANALYSES_ROUTE,
  (pathname) => pathname.startsWith(`${ANALYSES_ROUTE}/`),
  (pathname) => pathname.startsWith('/review-notes/'),
  (pathname) => pathname === '/history',
  (pathname) => pathname === '/settings',
];

const adminRouteMatchers: RouteMatcher[] = [
  (pathname) => pathname === DEFAULT_ADMIN_ROUTE || pathname.startsWith('/admin/'),
];

export function getDefaultRouteForRole(role: UserRole): string {
  return role === 'ADMIN' ? DEFAULT_ADMIN_ROUTE : DEFAULT_USER_ROUTE;
}

export function getDefaultAuthenticatedRoute(user: AppUser): string {
  if (user.role === 'USER' && user.settingsCompleted === false) {
    return '/settings';
  }

  return getDefaultRouteForRole(user.role);
}

export function isPathAllowedForRole(pathname: string, role: UserRole): boolean {
  const normalizedPath = pathname || '/';
  const matchers = role === 'ADMIN' ? adminRouteMatchers : userRouteMatchers;
  return matchers.some((matcher) => matcher(normalizedPath));
}