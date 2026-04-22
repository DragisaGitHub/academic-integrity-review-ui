import { apiEndpoints, getJson, HttpError, requestJson } from '../api';
import type { Notification, NotificationListResult, NotificationSeverity, NotificationType } from '../types';

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

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseNotificationType(value: unknown): NotificationType | undefined {
  const normalized = (asString(value) ?? '').trim().toLowerCase().replace(/[_\s]+/g, '-');
  if (normalized === 'analysis-completed' || normalized === 'analysis-failed') return normalized;
  return undefined;
}

function parseSeverity(value: unknown, fallbackType?: NotificationType): NotificationSeverity {
  const normalized = (asString(value) ?? '').trim().toLowerCase().replace(/[_\s]+/g, '-');
  if (normalized === 'success' || normalized === 'error' || normalized === 'info') return normalized;
  if (fallbackType === 'analysis-completed') return 'success';
  if (fallbackType === 'analysis-failed') return 'error';
  return 'info';
}

function defaultTitle(type: NotificationType): string {
  switch (type) {
    case 'analysis-completed':
      return 'Analysis complete';
    case 'analysis-failed':
      return 'Analysis failed';
    default:
      return 'Notification';
  }
}

function defaultMessage(type: NotificationType, documentTitle: string): string {
  if (type === 'analysis-failed') {
    return `${documentTitle} - analysis could not be completed`;
  }

  return `${documentTitle} - analysis finished successfully`;
}

function defaultRoute(type: NotificationType, documentId: string): string {
  switch (type) {
    case 'analysis-completed':
    case 'analysis-failed':
    default:
      return `/analysis/${encodeURIComponent(documentId)}`;
  }
}

function mapNotificationDto(payload: unknown, index: number): Notification | null {
  if (!isRecord(payload)) return null;

  const type = parseNotificationType(payload.type);
  const documentId = asString(payload.documentId) ?? (asNumber(payload.documentId) !== undefined ? String(asNumber(payload.documentId)) : undefined);
  if (!type || !documentId) return null;

  const documentTitle = asString(payload.documentTitle) ?? asString(payload.titleContext) ?? `Document ${documentId}`;
  const title = asString(payload.title) ?? defaultTitle(type);
  const message = asString(payload.message) ?? defaultMessage(type, documentTitle);
  const createdAt = asString(payload.createdAt) ?? new Date().toISOString();
  const id = asString(payload.id) ?? (asNumber(payload.id) !== undefined ? String(asNumber(payload.id)) : `${type}-${documentId}-${index}`);

  return {
    id,
    type,
    title,
    message,
    severity: parseSeverity(payload.severity, type),
    read: asBoolean(payload.read) ?? false,
    createdAt,
    documentId,
    route: asString(payload.route) ?? defaultRoute(type, documentId),
  };
}

function emptyNotifications(): NotificationListResult {
  return {
    notifications: [],
    unreadCount: 0,
  };
}

export interface ListNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
  signal?: AbortSignal;
}

export async function listNotificationsFromApi(
  options: ListNotificationsOptions = {},
): Promise<NotificationListResult> {
  const searchParams = new URLSearchParams();
  if (typeof options.limit === 'number') searchParams.set('limit', String(options.limit));
  if (options.unreadOnly) searchParams.set('unreadOnly', 'true');

  const path = searchParams.size > 0 ? `${apiEndpoints.notifications}?${searchParams.toString()}` : apiEndpoints.notifications;

  try {
    const payload = await getJson<unknown>(path, { signal: options.signal });

    if (Array.isArray(payload)) {
      const notifications = payload
        .map((item, index) => mapNotificationDto(item, index))
        .filter((item): item is Notification => Boolean(item));

      return {
        notifications,
        unreadCount: notifications.filter((item) => !item.read).length,
      };
    }

    if (!isRecord(payload)) return emptyNotifications();

    const rawNotifications = Array.isArray(payload.notifications) ? payload.notifications : [];
    const notifications = rawNotifications
      .map((item, index) => mapNotificationDto(item, index))
      .filter((item): item is Notification => Boolean(item));

    return {
      notifications,
      unreadCount: asNumber(payload.unreadCount) ?? notifications.filter((item) => !item.read).length,
    };
  } catch (error) {
    if (error instanceof HttpError && [404, 405, 501].includes(error.status)) {
      return emptyNotifications();
    }

    throw error;
  }
}

export async function markNotificationAsReadToApi(id: string): Promise<void> {
  if (!id) return;

  await requestJson<void>(apiEndpoints.notificationRead(id), {
    method: 'PATCH',
  });
}

export async function markAllNotificationsAsReadToApi(): Promise<void> {
  await requestJson<void>(apiEndpoints.notificationsReadAll, {
    method: 'PATCH',
  });
}