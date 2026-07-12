import mongoose from 'mongoose';
import { Notification, NOTIFICATION_TYPES } from './notification.model.js';
import { toPublicUser } from '../users/user.service.js';
import { toOffsetPage } from '../../utils/pagination.js';

// ---------------------------------------------------------------------------
// SSE client registry
// Maps userId (string) to a set of active Express response objects.
// ---------------------------------------------------------------------------
const sseClients = new Map();

const NOTIFICATION_PREFERENCE_BY_TYPE = {
  friend_request_received: 'muteFriendRequest',
  friend_request_accepted: 'muteFriendRequest',
  milestone_reacted: 'muteReaction',
  story_liked: 'muteLike',
  story_commented: 'muteComment',
  story_tagged: 'muteTag',
  challenge_invitation_received: 'muteChallengeInvitation',
};

// SSE streams are kept in memory because they are short-lived browser
// connections. Mongo stores notifications; this map only wakes open clients.
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
      unregisterSSEClient(id, res);
    }
  }, 25_000);
  heartbeat.unref?.();

  // Store the interval on the response so we can clear it on close.
  res._sseHeartbeat = heartbeat;
}

export function unregisterSSEClient(userId, res) {
  const id = userId.toString();
  clearInterval(res._sseHeartbeat);
  res._sseHeartbeat = null;
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
      // Client disconnected mid-write.
      unregisterSSEClient(id, res);
    }
  }
}

export function notifyNotificationsChanged(...userIds) {
  const uniqueUserIds = new Set(
    userIds
      .flat()
      .filter(Boolean)
      .map((id) => id.toString())
  );

  uniqueUserIds.forEach((id) => pushToUser(id, 'refresh', {}));
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

function isMutedByPreference(type, preferences = {}) {
  if (preferences.muteAll) {
    return true;
  }

  const preferenceKey = NOTIFICATION_PREFERENCE_BY_TYPE[type];
  return Boolean(preferenceKey && preferences[preferenceKey]);
}

async function shouldCreateNotification(recipientId, type) {
  try {
    const recipientUser = await mongoose.model('User')
      .findById(recipientId)
      .select('notificationPreferences')
      .lean();

    return !isMutedByPreference(type, recipientUser?.notificationPreferences);
  } catch (err) {
    console.error('Failed to fetch user notification preferences:', err);
    return true;
  }
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

export async function deleteNotificationsByFilter(filter) {
  // Shared stale-notification cleanup for social, story, and challenge flows.
  // Recipients are collected before deleteMany so their bell counters refresh.
  const recipients = await Notification.distinct('recipient', filter);
  const result = await Notification.deleteMany(filter);

  if ((result.deletedCount ?? 0) > 0) {
    notifyNotificationsChanged(recipients);
  }

  return result;
}

export async function createNotification({
  recipientId,
  actorId,
  type,
  entityType,
  entityId,
  metadata = {},
  deduplicate = false,
  renotifyExisting = false,
}) {
  if (!recipientId || !actorId || sameId(recipientId, actorId)) {
    return null;
  }

  if (!NOTIFICATION_TYPES.includes(type)) {
    throw new Error(`Unsupported notification type: ${type}`);
  }

  if (!(await shouldCreateNotification(recipientId, type))) {
    return null;
  }

  if (deduplicate) {
    // Upsert: at most one notification per (recipient, actor, type, entityId).
    // Matches the compound index on the Notification collection.
    const filter = { recipient: recipientId, actor: actorId, type, entityId };
    const setFields = { entityType, metadata };

    if (renotifyExisting) {
      // Some deduped notifications represent a fresh user action each time.
      // Resetting readAt makes the bell counter behave like a new notification
      // while still keeping only one notification row for this actor and entity.
      setFields.readAt = null;
    }

    const result = await Notification.updateOne(
      filter,
      {
        // Always keep entityType and metadata current.
        $set: setFields,
        // createdAt is only written on insert (ignored on update).
        $setOnInsert: renotifyExisting
          ? { createdAt: new Date() }
          : { createdAt: new Date(), readAt: null },
      },
      { upsert: true },
    );

    // Usually only brand-new deduped notifications are pushed. Callers can opt
    // into re-pushing when an existing row still represents a fresh action.
    if (result.upsertedCount > 0 || renotifyExisting) {
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

export async function listNotifications({ userId, limit = 30, pagination = null }) {
  const queryLimit = pagination ? pagination.fetchLimit : limit;
  const notifications = await Notification.find({ recipient: userId })
    .populate('actor')
    .sort({ createdAt: -1 })
    .limit(queryLimit);

  const items = notifications.map(toNotificationResponse);

  return pagination ? toOffsetPage(items, pagination) : items;
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

  if ((result.modifiedCount ?? 0) > 0) {
    notifyNotificationsChanged(userId);
  }

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

  if (notification) {
    notifyNotificationsChanged(userId);
  }

  return {
    notification: notification ? toNotificationResponse(notification) : null,
  };
}

export async function clearAll({ userId }) {
  const result = await Notification.deleteMany({ recipient: userId });

  if ((result.deletedCount ?? 0) > 0) {
    notifyNotificationsChanged(userId);
  }

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

  if (result) {
    notifyNotificationsChanged(userId);
  }

  return { deleted: Boolean(result) };
}
