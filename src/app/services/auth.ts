import type { AppUser, ChangePasswordRequest, LoginRequest, LoginResponse } from '../types';
import { apiEndpoints, getJson, patchJson, postJson } from '../api';
import { mapAppUserDto } from './userMapping';

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

export async function loginToApi(request: LoginRequest): Promise<LoginResponse> {
  const payload = await postJson<unknown, LoginRequest>(apiEndpoints.authLogin, request, {
    skipAuth: true,
    skipUnauthorizedRedirect: true,
  });

  if (!isRecord(payload)) {
    throw new Error('Login returned an unexpected payload shape.');
  }

  const token = asString(payload.token) ?? asString(payload.accessToken) ?? '';
  const userPayload = isRecord(payload.user) ? payload.user : payload;

  if (!token) {
    throw new Error('Login succeeded but no token was returned.');
  }

  return {
    token,
    user: mapAppUserDto(userPayload),
  };
}

export async function getCurrentUserFromApi(): Promise<AppUser> {
  const payload = await getJson<unknown>(apiEndpoints.authMe);
  return mapAppUserDto(payload);
}

export async function changeOwnPasswordToApi(request: ChangePasswordRequest): Promise<void> {
  await patchJson<void, ChangePasswordRequest>(apiEndpoints.authPassword, request);
}