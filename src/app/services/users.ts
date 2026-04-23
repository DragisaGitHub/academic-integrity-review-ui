import { apiEndpoints, getJson, patchJson, postJson, putJson } from '../api';
import type { AppUser, CreateUserRequest, ResetUserPasswordRequest, UpdateUserRequest } from '../types';
import { hasUserBackendId, mapAppUserDto } from './userMapping';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeUsersPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload) && Array.isArray(payload.users)) return payload.users;
  return [];
}

export async function listUsersFromApi(): Promise<AppUser[]> {
  const payload = await getJson<unknown>(apiEndpoints.users);
  return normalizeUsersPayload(payload).map(mapAppUserDto).filter(hasUserBackendId);
}

export async function createUserToApi(request: CreateUserRequest): Promise<AppUser> {
  const payload = await postJson<unknown, CreateUserRequest>(apiEndpoints.users, request);
  return mapAppUserDto(payload);
}

export async function updateUserByIdToApi(userId: string, request: UpdateUserRequest): Promise<AppUser> {
  const payload = await putJson<unknown, UpdateUserRequest>(apiEndpoints.user(userId), request);
  return mapAppUserDto(payload);
}

export async function resetUserPasswordByIdToApi(userId: string, request: ResetUserPasswordRequest): Promise<void> {
  await patchJson<void, ResetUserPasswordRequest>(apiEndpoints.userPassword(userId), request);
}