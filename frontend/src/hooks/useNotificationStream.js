import { useEffect, useRef } from 'react';
import { notificationStreamUrl } from '../../config.js';

const RECONNECT_DELAY_MS = 3_000;

/**
 * Opens a Server-Sent Events connection to /api/notifications/stream and
 * calls `onNotification` whenever the server pushes a new notification.
 *
 * The hook automatically reconnects after network interruptions.
 * It closes the EventSource cleanly on component unmount.
 *
 * @param {(notification: object) => void} onNotification
 * @param {boolean} enabled - set false to skip opening (e.g. user is logged out)
 */
export function useNotificationStream(onNotification, enabled = true) {
  // Stable ref so the effect doesn't re-run when the callback changes identity.
  const callbackRef = useRef(onNotification);
  callbackRef.current = onNotification;

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('howly_token');
    if (!token) return;

    let es = null;
    let reconnectTimer = null;
    let active = true;

    function connect() {
      if (!active) return;

      es = new EventSource(notificationStreamUrl(token));

      es.addEventListener('notification', (event) => {
        try {
          const notification = JSON.parse(event.data);
          callbackRef.current(notification);
        } catch {
          // Malformed JSON — ignore.
        }
      });

      es.addEventListener('refresh', () => {
        window.dispatchEvent(new Event('howly:notifications-updated'));
      });

      // 'connected' confirms the server accepted the stream.
      es.addEventListener('connected', () => {
        // Connected successfully — nothing extra needed.
      });

      es.onerror = () => {
        // EventSource has its own reconnect logic, but we add an explicit
        // back-off to avoid hammering the server if it's unavailable.
        es.close();
        if (active) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    }

    connect();

    return () => {
      active = false;
      clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [enabled]);
}
