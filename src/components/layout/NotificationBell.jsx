import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import {
    clearNotifications,
    deleteNotification,
    getNotifications,
    getUnreadNotificationCount,
    markNotificationRead,
} from '@/services/notificationApi';
import { setNotificationMenuOpen } from '@/components/layout/notificationMenuState';
import { NotificationDropdown } from '@/components/layout/NotificationDropdown';

const NOTIFICATION_PAGE_SIZE = 10;

function normalizeNotificationPage(response) {
    // Older API responses returned a plain array. Accept both shapes so the
    // paginated backend can coexist with an already-open frontend.
    if (Array.isArray(response)) {
        return {
            items: response,
            hasMore: false,
            nextOffset: response.length,
        };
    }

    return {
        items: response?.items ?? [],
        hasMore: response?.hasMore === true,
        nextOffset: Number.isInteger(response?.nextOffset)
            ? response.nextOffset
            : (response?.items?.length ?? 0),
    };
}

export function NotificationBell({ user }) {
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [removingNotificationIds, setRemovingNotificationIds] = useState([]);
    const [visibleUnreadNotificationIds, setVisibleUnreadNotificationIds] = useState(new Set());
    const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
    const [isLoadingMoreNotifications, setIsLoadingMoreNotifications] = useState(false);
    const [hasMoreNotifications, setHasMoreNotifications] = useState(false);
    const notificationMenuRef = useRef(null);
    const notificationListRef = useRef(null);
    const readingNotificationIdsRef = useRef(new Set());
    const pendingNotificationReadPromisesRef = useRef(new Map());
    const notificationLoadedCountRef = useRef(NOTIFICATION_PAGE_SIZE);
    const isMenuOpenRef = useRef(false);
    const displayedUnreadNotificationCount = user ? unreadNotificationCount : 0;

    const closeNotificationMenu = useCallback(() => {
        // The unread red dot is visual while the dropdown is open. Closing the
        // menu clears that local state and lets the stored read count take over.
        isMenuOpenRef.current = false;
        setNotificationMenuOpen(false);
        setIsNotificationMenuOpen(false);
        setVisibleUnreadNotificationIds(new Set());
    }, []);

    const markNotificationReadOnce = useCallback((notificationId, { keepVisibleUnread = false } = {}) => {
        const pendingPromise = pendingNotificationReadPromisesRef.current.get(notificationId);
        if (pendingPromise) {
            return pendingPromise;
        }

        readingNotificationIdsRef.current.add(notificationId);

        const readPromise = markNotificationRead(notificationId)
            .then((updatedNotification) => {
                setNotifications((currentNotifications) =>
                    currentNotifications.map((notification) =>
                        notification.id === notificationId
                            ? { ...notification, readAt: updatedNotification.readAt }
                            : notification
                    )
                );

                if (!keepVisibleUnread) {
                    setVisibleUnreadNotificationIds((currentIds) => {
                        const nextIds = new Set(currentIds);
                        nextIds.delete(notificationId);
                        return nextIds;
                    });
                }

                return updatedNotification;
            })
            .finally(() => {
                readingNotificationIdsRef.current.delete(notificationId);
                pendingNotificationReadPromisesRef.current.delete(notificationId);
            });

        pendingNotificationReadPromisesRef.current.set(notificationId, readPromise);
        return readPromise;
    }, []);

    useEffect(() => {
        if (!user) {
            return undefined;
        }

        let isMounted = true;

        async function refreshNotifications() {
            if (isMenuOpenRef.current) return;
            try {
                const result = await getUnreadNotificationCount();

                if (isMounted) {
                    setUnreadNotificationCount(result?.unreadCount ?? 0);
                }
            } catch {
                if (isMounted) {
                    setUnreadNotificationCount(0);
                }
            }
        }

        refreshNotifications();
        const intervalId = setInterval(refreshNotifications, 60000);
        window.addEventListener('howly:notifications-updated', refreshNotifications);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
            window.removeEventListener('howly:notifications-updated', refreshNotifications);
        };
    }, [user]);

    useEffect(() => {
        if (user) {
            return;
        }

        closeNotificationMenu();
        setUnreadNotificationCount(0);
        setNotifications([]);
        setRemovingNotificationIds([]);
        setHasMoreNotifications(false);
        notificationLoadedCountRef.current = NOTIFICATION_PAGE_SIZE;
    }, [closeNotificationMenu, user]);

    useEffect(() => {
        return () => {
            setNotificationMenuOpen(false);
        };
    }, []);

    useEffect(() => {
        function handleDocumentPointerDown(event) {
            if (!notificationMenuRef.current?.contains(event.target)) {
                closeNotificationMenu();
                window.dispatchEvent(new Event('howly:notifications-updated'));
            }
        }

        if (isNotificationMenuOpen) {
            document.addEventListener('pointerdown', handleDocumentPointerDown);
        }

        return () => {
            document.removeEventListener('pointerdown', handleDocumentPointerDown);
        };
    }, [closeNotificationMenu, isNotificationMenuOpen]);

    useEffect(() => {
        const listElement = notificationListRef.current;

        if (!isNotificationMenuOpen || !listElement || !notifications.length) {
            return undefined;
        }

        const notificationsById = new Map(notifications.map((notification) => [notification.id, notification]));

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const notificationId = entry.target.dataset.notificationId;

                    if (!notificationId) {
                        return;
                    }

                    const notification = notificationsById.get(notificationId);
                    const isRead = Boolean(notification?.readAt);
                    const isFullyVisible = entry.intersectionRatio >= 0.98;

                    if (isFullyVisible && !isRead) {
                        // Mark read in the backend, but keep the dot visible
                        // until the row leaves view or the menu closes.
                        setVisibleUnreadNotificationIds((currentIds) => {
                            if (currentIds.has(notificationId)) return currentIds;
                            const nextIds = new Set(currentIds);
                            nextIds.add(notificationId);
                            return nextIds;
                        });

                        if (!readingNotificationIdsRef.current.has(notificationId)) {
                            markNotificationReadOnce(notificationId, { keepVisibleUnread: true })
                                .catch(() => {});
                        }

                        return;
                    }

                    if (!isFullyVisible && (isRead || readingNotificationIdsRef.current.has(notificationId))) {
                        setVisibleUnreadNotificationIds((currentIds) => {
                            if (!currentIds.has(notificationId)) return currentIds;
                            const nextIds = new Set(currentIds);
                            nextIds.delete(notificationId);
                            return nextIds;
                        });
                    }
                });
            },
            {
                root: listElement,
                threshold: [0, 0.98],
            }
        );

        listElement
            .querySelectorAll('[data-notification-id]')
            .forEach((element) => observer.observe(element));

        return () => {
            observer.disconnect();
        };
    }, [isNotificationMenuOpen, markNotificationReadOnce, notifications]);

    async function handleNotificationBellClick() {
        const nextIsOpen = !isNotificationMenuOpen;

        isMenuOpenRef.current = nextIsOpen;
        setNotificationMenuOpen(nextIsOpen);
        setIsNotificationMenuOpen(nextIsOpen);

        if (!nextIsOpen) {
            setVisibleUnreadNotificationIds(new Set());
            window.dispatchEvent(new Event('howly:notifications-updated'));
            return;
        }

        setIsLoadingNotifications(true);

        try {
            const notificationList = await getNotifications({
                limit: NOTIFICATION_PAGE_SIZE,
                offset: 0,
            });
            const notificationPage = normalizeNotificationPage(notificationList);
            const nextNotifications = notificationPage.items;

            setNotifications(nextNotifications);
            setRemovingNotificationIds([]);
            setHasMoreNotifications(notificationPage.hasMore);
            notificationLoadedCountRef.current = Math.max(notificationPage.nextOffset, NOTIFICATION_PAGE_SIZE);
            setVisibleUnreadNotificationIds(
                new Set(nextNotifications.filter((notification) => !notification.readAt).map((notification) => notification.id))
            );
        } catch {
            setNotifications([]);
            setHasMoreNotifications(false);
            setVisibleUnreadNotificationIds(new Set());
        } finally {
            setIsLoadingNotifications(false);
        }
    }

    async function handleLoadMoreNotifications() {
        if (isLoadingMoreNotifications || !hasMoreNotifications) {
            return;
        }

        // Load older notifications in small pages so the bell opens quickly for
        // users with a long history.
        setIsLoadingMoreNotifications(true);

        try {
            const currentOffset = notificationLoadedCountRef.current;
            const notificationList = await getNotifications({
                limit: NOTIFICATION_PAGE_SIZE,
                offset: currentOffset,
            });
            const notificationPage = normalizeNotificationPage(notificationList);

            setNotifications((currentNotifications) => {
                const seenIds = new Set(currentNotifications.map((notification) => notification.id));
                const nextItems = notificationPage.items.filter((notification) => {
                    if (seenIds.has(notification.id)) {
                        return false;
                    }

                    seenIds.add(notification.id);
                    return true;
                });

                return [...currentNotifications, ...nextItems];
            });
            notificationLoadedCountRef.current = Math.max(
                notificationPage.nextOffset,
                currentOffset + notificationPage.items.length
            );
            setHasMoreNotifications(notificationPage.hasMore);
            setVisibleUnreadNotificationIds((currentIds) => {
                const nextIds = new Set(currentIds);
                notificationPage.items.forEach((notification) => {
                    if (!notification.readAt) {
                        nextIds.add(notification.id);
                    }
                });
                return nextIds;
            });
        } catch {
            // Keep the loaded page intact if older notifications fail to load.
        } finally {
            setIsLoadingMoreNotifications(false);
        }
    }

    async function handleClearNotifications() {
        try {
            await clearNotifications();
            setNotifications([]);
            setRemovingNotificationIds([]);
            setVisibleUnreadNotificationIds(new Set());
            setHasMoreNotifications(false);
            notificationLoadedCountRef.current = NOTIFICATION_PAGE_SIZE;
            setUnreadNotificationCount(0);
            window.dispatchEvent(new Event('howly:notifications-updated'));
        } catch {
            // Keep the current list visible if clearing fails.
        }
    }

    async function handleDeleteNotification(event, notificationId) {
        event.stopPropagation();

        if (removingNotificationIds.includes(notificationId)) {
            return;
        }

        const targetNotification = notifications.find((notification) => notification.id === notificationId);
        const wasUnread = targetNotification && !targetNotification.readAt;

        // Optimistically animate the row out, then remove it after the backend
        // delete succeeds.
        setRemovingNotificationIds((currentIds) => [...currentIds, notificationId]);

        try {
            await deleteNotification(notificationId);
            if (wasUnread) {
                setUnreadNotificationCount((currentCount) => Math.max(0, currentCount - 1));
            }
            window.setTimeout(() => {
                notificationLoadedCountRef.current = Math.max(
                    0,
                    notificationLoadedCountRef.current - 1
                );
                setNotifications((currentNotifications) =>
                    currentNotifications.filter((notification) => notification.id !== notificationId)
                );
                setVisibleUnreadNotificationIds((currentIds) => {
                    const nextIds = new Set(currentIds);
                    nextIds.delete(notificationId);
                    return nextIds;
                });
                setRemovingNotificationIds((currentIds) =>
                    currentIds.filter((currentId) => currentId !== notificationId)
                );
            }, 180);
            window.dispatchEvent(new Event('howly:notifications-updated'));
        } catch {
            setRemovingNotificationIds((currentIds) =>
                currentIds.filter((currentId) => currentId !== notificationId)
            );
        }
    }

    function handleNotificationClick(notificationId) {
        const targetNotification = notifications.find((notification) => notification.id === notificationId);
        const wasUnread = targetNotification && !targetNotification.readAt;

        setVisibleUnreadNotificationIds((currentIds) => {
            const nextIds = new Set(currentIds);
            nextIds.delete(notificationId);
            return nextIds;
        });
        closeNotificationMenu();

        if (!wasUnread) {
            window.dispatchEvent(new Event('howly:notifications-updated'));
            return;
        }

        setUnreadNotificationCount((currentCount) => Math.max(0, currentCount - 1));
        markNotificationReadOnce(notificationId)
            .catch(() => {})
            .finally(() => {
                window.dispatchEvent(new Event('howly:notifications-updated'));
            });
    }

    if (!user) {
        return null;
    }

    return (
        <div ref={notificationMenuRef} className="relative">
            <button
                type="button"
                className="relative flex size-11 items-center justify-center rounded-full border border-theme-text/10 bg-theme-text/5 text-theme-text-soft transition hover:bg-theme-text/10 hover:text-theme-text"
                aria-label={
                    displayedUnreadNotificationCount > 0
                        ? `${displayedUnreadNotificationCount} unread notifications`
                        : 'Notifications'
                }
                aria-expanded={isNotificationMenuOpen}
                onClick={handleNotificationBellClick}
            >
                <Bell className="size-5" aria-hidden="true" />
                {displayedUnreadNotificationCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-5 text-white">
                        {displayedUnreadNotificationCount > 99 ? '99+' : displayedUnreadNotificationCount}
                    </span>
                ) : null}
            </button>

            {isNotificationMenuOpen ? (
                <NotificationDropdown
                    listRef={notificationListRef}
                    notifications={notifications}
                    removingNotificationIds={removingNotificationIds}
                    visibleUnreadNotificationIds={visibleUnreadNotificationIds}
                    isLoading={isLoadingNotifications}
                    isLoadingMore={isLoadingMoreNotifications}
                    hasMore={hasMoreNotifications}
                    onClear={handleClearNotifications}
                    onDelete={handleDeleteNotification}
                    onLoadMore={handleLoadMoreNotifications}
                    onNotificationClick={handleNotificationClick}
                />
            ) : null}
        </div>
    );
}
