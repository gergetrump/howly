import { Router } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../../config.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  getUnreadCount,
  listNotifications,
  clearNotifications,
  deleteNotification,
  markNotificationRead,
  markNotificationsRead,
  streamNotifications,
} from './notification.controller.js';

const router = Router();

// Special middleware for the SSE stream: EventSource cannot send the
// Authorization header, so the JWT is accepted via the `token` query param.
function requireAuthFromQuery(req, res, next) {
  const token = req.query.token;

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// SSE stream — uses query-param auth (see above).
router.get('/stream', requireAuthFromQuery, streamNotifications);

// All other routes require a standard Bearer token.
router.use(requireAuth);

router.get('/unread-count', getUnreadCount);
router.get('/', listNotifications);
router.post('/read', markNotificationsRead);
router.post('/:notificationId/read', markNotificationRead);
router.delete('/', clearNotifications);
router.delete('/:notificationId', deleteNotification);

export default router;
