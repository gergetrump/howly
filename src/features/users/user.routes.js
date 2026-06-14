import { Router } from 'express';
import { 
    getCurrentUser, 
    updateCurrentUser, 
    deleteCurrentUser, 
    completeOnboarding,
    uploadCurrentUserProfilePicture,
    deleteCurrentUserProfilePicture,
    searchUsers
} from './user.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { uploadProfilePicture } from '../../middleware/upload.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/search', searchUsers);
router.get('/me', getCurrentUser);
router.patch('/me', updateCurrentUser);
router.post('/me/complete-onboarding', completeOnboarding);
router.delete('/me', deleteCurrentUser);

router.patch(
    '/me/profile-picture',
    uploadProfilePicture.single('profilePicture'),
    uploadCurrentUserProfilePicture
);

router.delete('/me/profile-picture', deleteCurrentUserProfilePicture);

export default router;
