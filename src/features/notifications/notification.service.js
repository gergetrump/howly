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
  deduplicate = false,
}) {
  if (!recipientId || !actorId || sameId(recipientId, actorId)) {
    return null;
  }

  if (!NOTIFICATION_TYPES.includes(type)) {
    throw new Error(`Unsupported notification type: ${type}`);
  }

  // Check recipient's notification preferences
  try {
    const recipientUser = await mongoose.model('User').findById(recipientId).select('notificationPreferences').lean();
    if (recipientUser) {
      const prefs = recipientUser.notificationPreferences ?? {};
      if (prefs.muteAll) {
        return null;
      }
      if (type === 'story_tagged' && prefs.muteTag) return null;
      if (type === 'story_commented' && prefs.muteComment) return null;
      if (type === 'story_liked' && prefs.muteLike) return null;
      if (type === 'milestone_reacted' && prefs.muteReaction) return null;
      if ((type === 'friend_request_received' || type === 'friend_request_accepted') && prefs.muteFriendRequest) return null;
    }
  } catch (err) {
    console.error('Failed to fetch user notification preferences:', err);
  }

  if (deduplicate) {
    // Upsert: at most one notification per (recipient, actor, type, entityId).
    // Re-uses the compound index on the Notification collection.
    const filter = { recipient: recipientId, actor: actorId, type, entityId };
    const result = await Notification.updateOne(
      filter,
      {
        // Always keep entityType and metadata current.
        $set: { entityType, metadata, readAt: null },
        // createdAt is only written on insert (ignored on update).
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );

    // Only push an SSE event when the document is brand-new.
    // If the actor spam-likes, the owner won't receive repeated pings.
    if (result.upsertedCount > 0) {
      try {
        const notification = await Notification.findOne(filter).populate('actor');
        if (notification) {
          pushToUser(recipientId, 'notification', toNotificationResponse(notification));
        }
      } catch {
        // SSE push failure must never break the main flow.
      }
    }

    return null;
  }

  // Default: always create a new document (suitable for types that are
  // meaningfully distinct even when they share the same entity, e.g. comments).
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
