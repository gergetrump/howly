import mongoose from 'mongoose';
import { Notification, NOTIFICATION_TYPES } from './notification.model.js';
import { toPublicUser } from '../users/user.service.js';

// ---------------------------------------------------------------------------
// SSE client registry
// Maps userId (string) → Set of active Express response objects.
// ---------------------------------------------------------------------------
const sseClients = new Map();

export function registerSSEClient(userId, res) {
  const id = userId.toString();
  if (!sseClients.has(id)) {
    sseClients.set(id, new Set());
  }
  sseClients.get(id).add(res);

  // Confirm the connection is alive.
  res.write('event: connected\ndata: {}\n\n');

  // Keep-alive ping every 25 s so proxies don't close idle connections.
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25_000);

  // Store the interval on the response so we can clear it on close.
  res._sseHeartbeat = heartbeat;
}

export function unregisterSSEClient(userId, res) {
  const id = userId.toString();
  clearInterval(res._sseHeartbeat);
  sseClients.get(id)?.delete(res);
  if (sseClients.get(id)?.size === 0) {
    sseClients.delete(id);
  }
}

export function pushToUser(userId, eventName, payload) {
  const id = userId.toString();
  const clients = sseClients.get(id);
  if (!clients || clients.size === 0) return;
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try {
      res.write(data);
    } catch {
      // Client disconnected mid-write — will be cleaned up on 'close'.
    }
  }
}

function sameId(firstId, secondId) {
  return firstId?.toString() === secondId?.toString();
}

function normalizeTypes(types) {
  if (!types) {
    return [];
  }

  const values = Array.isArray(types) ? types : [types];

  return values.filter((type) => NOTIFICATION_TYPES.includes(type));
}

function toNotificationResponse(notification) {
  return {
    id: notification._id.toString(),
    type: notification.type,
    actor: toPublicUser(notification.actor),
    entityType: notification.entityType,
    entityId: notification.entityId.toString(),
    readAt: notification.readAt,
    metadata: notification.metadata ?? {},
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}

export async function createNotification({
  recipientId,
  actorId,
  type,
  entityType,
  entityId,
  metadata = {},
}) {
  if (!recipientId || !actorId || sameId(recipientId, actorId)) {
    return null;
  }

  if (!NOTIFICATION_TYPES.includes(type)) {
    throw new Error(`Unsupported notification type: ${type}`);
  }

  const notification = await Notification.create({
    recipient: recipientId,
    actor: actorId,
    type,
    entityType,
    entityId,
    metadata,
  });

  // Push to any open SSE streams for this recipient immediately.
  try {
    const populated = await notification.populate('actor');
    pushToUser(recipientId, 'notification', toNotificationResponse(populated));
  } catch {
    // SSE push failure must never break the main flow.
  }

  return notification;
}

export async function getUnreadCount({ userId, types }) {
  const query = {
    recipient: userId,
    readAt: null,
  };
  const normalizedTypes = normalizeTypes(types);

  if (normalizedTypes.length) {
    query.type = { $in: normalizedTypes };
  }

  const unreadCount = await Notification.countDocuments(query);

  return { unreadCount };
}

export async function listNotifications({ userId, limit = 30 }) {
  const notifications = await Notification.find({ recipient: userId })
    .populate('actor')
    .sort({ createdAt: -1 })
    .limit(limit);

  return notifications.map(toNotificationResponse);
}

export async function markAsRead({ userId, types }) {
  const query = {
    recipient: userId,
    readAt: null,
  };
  const normalizedTypes = normalizeTypes(types);

  if (normalizedTypes.length) {
    query.type = { $in: normalizedTypes };
  }

  const result = await Notification.updateMany(query, {
    $set: { readAt: new Date() },
  });

  return { modifiedCount: result.modifiedCount ?? 0 };
}

export async function markNotificationAsRead({ userId, notificationId }) {
  if (!mongoose.isValidObjectId(notificationId)) {
    return { notification: null };
  }

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: userId,
    },
    {
      $set: { readAt: new Date() },
    },
    {
      returnDocument: 'after',
    }
  )
    .populate('actor');

  return {
    notification: notification ? toNotificationResponse(notification) : null,
  };
}

export async function clearAll({ userId }) {
  const result = await Notification.deleteMany({ recipient: userId });

  return { deletedCount: result.deletedCount ?? 0 };
}

export async function deleteNotification({ userId, notificationId }) {
  if (!mongoose.isValidObjectId(notificationId)) {
    return { deleted: false };
  }

  const result = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId,
  });

  return { deleted: Boolean(result) };
}
