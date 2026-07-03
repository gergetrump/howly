import * as notificationService from './notification.service.js';
import { registerSSEClient, unregisterSSEClient } from './notification.service.js';

// SSE endpoint — `EventSource` cannot send custom headers so the JWT travels
// as a query parameter validated by `requireAuthFromQuery` in notification.routes.js.
export function streamNotifications(req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // disable nginx buffering
  });
  res.flushHeaders();

  registerSSEClient(req.user.id, res);

  req.on('close', () => {
    unregisterSSEClient(req.user.id, res);
  });
}

export async function getUnreadCount(req, res) {
  const result = await notificationService.getUnreadCount({
    userId: req.user.id,
    types: req.query.types ? req.query.types.split(',') : undefined,
  });

  return res.status(200).json(result);
}

export async function listNotifications(req, res) {
  const notifications = await notificationService.listNotifications({
    userId: req.user.id,
  });

  return res.status(200).json(notifications);
}

export async function markNotificationsRead(req, res) {
  const result = await notificationService.markAsRead({
    userId: req.user.id,
    types: req.body?.types,
  });

  return res.status(200).json(result);
}

export async function markNotificationRead(req, res) {
  const result = await notificationService.markNotificationAsRead({
    userId: req.user.id,
    notificationId: req.params.notificationId,
  });

  if (!result.notification) {
    return res.status(404).json({ message: 'Notification not found', code: 'NOTIFICATION_NOT_FOUND' });
  }

  return res.status(200).json(result.notification);
}

export async function clearNotifications(req, res) {
  const result = await notificationService.clearAll({
    userId: req.user.id,
  });

  return res.status(200).json(result);
}

export async function deleteNotification(req, res) {
  const result = await notificationService.deleteNotification({
    userId: req.user.id,
    notificationId: req.params.notificationId,
  });

  if (!result.deleted) {
    return res.status(404).json({ message: 'Notification not found', code: 'NOTIFICATION_NOT_FOUND' });
  }

  return res.status(200).json(result);
}
