import { Link } from 'react-router-dom';
import { Bell, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    getNotificationLink,
    getNotificationMessage,
    getNotificationNavigationState,
} from '@/components/layout/notificationHelpers';

function formatNotificationTime(createdAt) {
    if (!createdAt) {
        return '';
    }

    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));

    if (elapsedMinutes < 1) {
        return 'now';
    }

    if (elapsedMinutes < 60) {
        return `${elapsedMinutes}m`;
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60);

    if (elapsedHours < 24) {
        return `${elapsedHours}h`;
    }

    return `${Math.floor(elapsedHours / 24)}d`;
}

export function NotificationDropdown({
    listRef,
    notifications,
    removingNotificationIds,
    visibleUnreadNotificationIds,
    isLoading,
    isLoadingMore,
    hasMore,
    onClear,
    onDelete,
    onLoadMore,
    onNotificationClick,
}) {
    return (
        <div className="absolute right-0 top-14 z-50 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-theme-text/10 bg-theme-bg/95 text-left shadow-2xl shadow-black/40 backdrop-blur">
            <div className="border-b border-theme-text/10 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold text-theme-text">Notifications</p>
                        <p className="text-xs text-theme-text-muted">Recent social updates</p>
                    </div>
                    {notifications.length ? (
                        <button
                            type="button"
                            className="rounded-full px-2 py-1 text-xs font-semibold text-theme-accent-soft transition hover:bg-theme-accent/15"
                            onClick={onClear}
                        >
                            Clear all
                        </button>
                    ) : null}
                </div>
            </div>

            <div ref={listRef} className="max-h-80 space-y-2 overflow-y-auto p-2">
                {isLoading ? (
                    <p className="px-3 py-6 text-center text-sm text-theme-text-muted">Loading...</p>
                ) : notifications.length ? (
                    <>
                        {notifications.map((notification) => {
                            const isRemoving = removingNotificationIds.includes(notification.id);
                            const isUnread = !notification.readAt;
                            const isVisuallyUnread = visibleUnreadNotificationIds.has(notification.id);

                            return (
                                <div
                                    key={notification.id}
                                    data-notification-id={notification.id}
                                    data-unread={isUnread ? 'true' : 'false'}
                                    className={cn(
                                        'group notification-row flex gap-3 rounded-xl px-3 py-3 transition duration-200',
                                        isVisuallyUnread
                                            ? 'bg-theme-accent/10 text-theme-accent-soft hover:bg-theme-accent/20'
                                            : 'bg-theme-surface-2/30 text-theme-text-soft hover:bg-theme-surface-2/45',
                                        isRemoving && 'translate-x-8 opacity-0',
                                    )}
                                >
                                    <Link
                                        to={getNotificationLink(notification)}
                                        state={getNotificationNavigationState(notification)}
                                        className="flex min-w-0 flex-1 gap-3"
                                        onClick={() => onNotificationClick(notification.id)}
                                    >
                                        <span
                                            className={cn(
                                                'mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-sm',
                                                isVisuallyUnread ? 'bg-theme-accent/20' : 'bg-theme-surface-2/50',
                                            )}
                                        >
                                            <Bell
                                                className={cn('size-4', isVisuallyUnread ? 'text-theme-accent-soft' : 'text-theme-text-soft')}
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-start gap-2">
                                                {isVisuallyUnread ? (
                                                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
                                                ) : null}
                                                <span className={cn('block text-sm font-semibold leading-snug', isVisuallyUnread ? 'text-theme-text' : 'text-theme-text-soft')}>
                                                    {getNotificationMessage(notification)}
                                                </span>
                                            </span>
                                            <span className={cn('mt-1 block text-xs', isVisuallyUnread ? 'text-theme-accent-soft/70' : 'text-theme-text-muted')}>
                                                {formatNotificationTime(notification.createdAt)}
                                            </span>
                                        </span>
                                    </Link>
                                    {/* Delete stays outside the Link so removal never triggers navigation. */}
                                    <button
                                        type="button"
                                        className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-theme-text-muted opacity-0 transition hover:bg-theme-text/10 hover:text-theme-text group-hover:opacity-100 focus:opacity-100"
                                        aria-label="Delete notification"
                                        onClick={(event) => onDelete(event, notification.id)}
                                    >
                                        <Trash2 className="size-4" aria-hidden="true" />
                                    </button>
                                </div>
                            );
                        })}
                        {hasMore ? (
                            <button
                                type="button"
                                className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-theme-accent-soft transition hover:bg-violet-400/15 disabled:cursor-wait disabled:opacity-60"
                                disabled={isLoadingMore}
                                onClick={onLoadMore}
                            >
                                {isLoadingMore ? 'Loading...' : 'Load more'}
                            </button>
                        ) : null}
                    </>
                ) : (
                    <p className="px-3 py-6 text-center text-sm text-theme-text-muted">No notifications yet</p>
                )}
            </div>
        </div>
    );
}
