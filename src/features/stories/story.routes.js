import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { uploadStoryImage } from '../../middleware/upload.middleware.js';
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

router.post('/', uploadStoryImage.single('image'), createStory);
router.get('/me', getMyActiveStories);
router.get('/me/archive', getMyArchive);
router.post('/:storyId/like', toggleStoryLike);
router.get('/:storyId/likes', getStoryLikes);
router.get('/:storyId/mention-candidates', getStoryMentionCandidates);
router.delete('/:storyId', deleteStory);

router.post('/:storyId/comments', addStoryComment);
router.get('/:storyId/comments', getStoryComments);
router.delete('/:storyId/comments/:commentId', deleteStoryComment);

export default router;
