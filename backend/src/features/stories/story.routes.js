import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { uploadStoryImage } from '../../middleware/upload.middleware.js';
import { rejectUnsafeRequestKeys } from '../../security/security.middleware.js';
import {
  createStory,
  getMyActiveStories,
  getMyArchive,
  toggleStoryLike,
  getStoryLikes,
  getStoryMentionCandidates,
  deleteStory,
  addStoryComment,
  getStoryComments,
  deleteStoryComment,
} from './story.controller.js';

const router = Router();

router.use(requireAuth);

/* Create a new story from an uploaded image. */
router.post('/', uploadStoryImage.single('image'), rejectUnsafeRequestKeys, createStory);
/* List the current user's stories still visible in the feed. */
router.get('/me', getMyActiveStories);
/* List the current user's archived stories (past the feed window). */
router.get('/me/archive', getMyArchive);
/* Toggle the current user's like on a story. */
router.post('/:storyId/like', toggleStoryLike);
/* List the users who liked a story. */
router.get('/:storyId/likes', getStoryLikes);
/* List users who can be @mentioned on a story. */
router.get('/:storyId/mention-candidates', getStoryMentionCandidates);
/* Delete one of the current user's stories. */
router.delete('/:storyId', deleteStory);

/* Add a comment to a story. */
router.post('/:storyId/comments', addStoryComment);
/* List a story's comments. */
router.get('/:storyId/comments', getStoryComments);
/* Delete a comment from a story. */
router.delete('/:storyId/comments/:commentId', deleteStoryComment);

export default router;
