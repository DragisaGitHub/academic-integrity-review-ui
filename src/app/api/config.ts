function normalizeBaseUrl(baseUrl: string): string {
  // Trim whitespace and remove trailing slashes.
  return baseUrl.trim().replace(/\/+$/, '');
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Backend API base URL.
 *
 * - Prefer configuring `VITE_API_BASE_URL` for local backend dev.
 * - Leave empty to use same-origin requests.
 */
export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL ?? '');

/**
 * Builds an absolute or same-origin URL for API requests.
 */
export function buildApiUrl(path: string): string {
  const normalizedPath = normalizePath(path);
  if (!API_BASE_URL) return normalizedPath;
  return `${API_BASE_URL}${normalizedPath}`;
}
