import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, Bell, Check, CheckCheck, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { cn } from '../ui/utils';
import type { Notification, NotificationSeverity } from '../../types';
import {
  listNotificationsFromApi,
  markAllNotificationsAsReadToApi,
  markNotificationAsReadToApi,
} from '../../services/notifications';

const POLL_INTERVAL_MS = 30000;
const RECENT_NOTIFICATIONS_LIMIT = 10;

function severityIcon(severity: NotificationSeverity) {
  switch (severity) {
    case 'success':
      return CheckCircle2;
    case 'error':
      return AlertCircle;
    case 'info':
    default:
      return Info;
  }
}

function formatRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Just now';

  const diffMs = timestamp - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 1) return 'Just now';
  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute');

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour');

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) return formatter.format(diffDays, 'day');

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null);

  async function loadNotifications(signal?: AbortSignal): Promise<void> {
    try {
      const result = await listNotificationsFromApi({
        limit: RECENT_NOTIFICATIONS_LIMIT,
        signal,
      });
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch {
      // Keep the bell quiet if the backend endpoint is not ready or temporarily unavailable.
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadNotifications(controller.signal);

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, POLL_INTERVAL_MS);

    const onFocus = () => {
      void loadNotifications();
    };

    window.addEventListener('focus', onFocus);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  async function handleMarkAsRead(notificationId: string): Promise<void> {
    setPendingNotificationId(notificationId);
    try {
      await markNotificationAsReadToApi(notificationId);
      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification,
        ),
      );
      setUnreadCount((previous) => Math.max(0, previous - 1));
    } catch {
      toast.error('Could not mark this notification as read.');
    } finally {
      setPendingNotificationId(null);
    }
  }

  async function handleNotificationClick(notification: Notification): Promise<void> {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    setOpen(false);
    navigate(notification.route);
  }

  async function handleMarkAllAsRead(): Promise<void> {
    setIsMarkingAllRead(true);
    try {
      await markAllNotificationsAsReadToApi();
      setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
      setUnreadCount(0);
    } catch {
      toast.error('Could not mark all notifications as read.');
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen);
    if (nextOpen) {
      setIsLoading((previous) => previous && notifications.length === 0);
      void loadNotifications();
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative')}
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 ? <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600" /> : null}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="z-[80] w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>

          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllRead}
              className="text-xs"
            >
              {isMarkingAllRead ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Mark all as read
            </Button>
          ) : null}
        </div>

        <Separator />

        {isLoading ? (
          <div className="flex min-h-52 items-center justify-center px-4 py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <div className="rounded-full bg-muted p-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-sm text-muted-foreground">
                You&apos;ll be notified when analyses complete or need attention.
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const Icon = severityIcon(notification.severity);
                const isPending = pendingNotificationId === notification.id;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3',
                      !notification.read && 'bg-blue-50/60 dark:bg-blue-950/20',
                    )}
                  >
                    <div className="mt-0.5 shrink-0 rounded-full bg-muted p-2">
                      <Icon
                        className={cn(
                          'h-4 w-4',
                          notification.severity === 'success' && 'text-emerald-600',
                          notification.severity === 'error' && 'text-destructive',
                          notification.severity === 'info' && 'text-blue-600',
                        )}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleNotificationClick(notification)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{notification.title}</p>
                            {!notification.read ? <span className="h-2 w-2 rounded-full bg-blue-600" /> : null}
                          </div>
                          <p className="line-clamp-2 text-sm text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">{formatRelativeTime(notification.createdAt)}</p>
                        </div>
                      </div>
                    </button>

                    {!notification.read ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-0.5 h-8 w-8 shrink-0"
                        onClick={() => void handleMarkAsRead(notification.id)}
                        disabled={isPending}
                        aria-label="Mark as read"
                      >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}