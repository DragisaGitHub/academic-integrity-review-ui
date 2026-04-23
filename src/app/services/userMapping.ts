import type { AppUser } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }
  return undefined;
}

function asUserId(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? normalized : undefined;
  }

  return undefined;
}

function parseRole(value: unknown): AppUser['role'] {
  return (asString(value) ?? '').trim().toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  return asBoolean(value);
}

export function mapAppUserDto(payload: unknown): AppUser {
  const record = isRecord(payload) ? payload : {};
  const username = asString(record.username) ?? '';

  return {
    id: asUserId(record.id) ?? asUserId(record.userId) ?? '',
    username,
    displayName: asString(record.displayName) ?? asString(record.name) ?? username,
    role: parseRole(record.role),
    enabled: asBoolean(record.enabled) ?? true,
    settingsCompleted: asOptionalBoolean(record.settingsCompleted),
    createdAt: asString(record.createdAt),
    updatedAt: asString(record.updatedAt),
  };
}

export function getUserBackendId(user: Pick<AppUser, 'id' | 'username'>): string {
  const userId = user.id.trim();

  if (!userId) {
    throw new Error(`User ${user.username} is missing a backend id.`);
  }

  return userId;
}

export function hasUserBackendId(user: Pick<AppUser, 'id'>): boolean {
  return user.id.trim().length > 0;
}