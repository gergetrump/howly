import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
    claimReward,
    createChallenge,
    deleteChallenge,
    getChallengeById,
    joinChallenge,
    leaveChallenge,
    listChallenges,
    listParticipants,
    recordProgress,
    updateChallenge,
} from './challenge.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', listChallenges);
router.post('/', createChallenge);
router.get('/:challengeId', getChallengeById);
router.patch('/:challengeId', updateChallenge);
router.delete('/:challengeId', deleteChallenge);
router.post('/:challengeId/join', joinChallenge);
router.post('/:challengeId/leave', leaveChallenge);
router.get('/:challengeId/participants', listParticipants);
router.post('/:challengeId/progress', recordProgress);
router.post('/:challengeId/reward', claimReward);

export default router;
