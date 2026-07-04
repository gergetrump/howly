import { Router } from 'express';
import {
    getCurrentUser, 
    getCurrentUserPlan,
    updateCurrentUser, 
    updateCurrentUserNotificationPreferences,
    deleteCurrentUser, 
    completeOnboarding,
    uploadCurrentUserProfilePicture,
    deleteCurrentUserProfilePicture,
    searchUsers,
    getUserByUsername,
} from './user.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { uploadProfilePicture } from '../../middleware/upload.middleware.js';
import { rejectUnsafeRequestKeys } from '../../security/security.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/search', searchUsers);
router.get('/profile/:username', getUserByUsername);
router.get('/me/plan', getCurrentUserPlan);
router.get('/me', getCurrentUser);
router.patch('/me', updateCurrentUser);
router.patch('/me/notification-preferences', updateCurrentUserNotificationPreferences);
router.post('/me/complete-onboarding', completeOnboarding);
router.delete('/me', deleteCurrentUser);

router.patch(
    '/me/profile-picture',
    uploadProfilePicture.single('profilePicture'),
    rejectUnsafeRequestKeys,
    uploadCurrentUserProfilePicture
);

router.delete('/me/profile-picture', deleteCurrentUserProfilePicture);

export default router;
