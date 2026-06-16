import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
    claimReward,
    acceptInvitation,
    createChallenge,
    createInvitation,
    deleteChallenge,
    getChallengeById,
    joinChallenge,
    leaveChallenge,
    listChallenges,
    listInvitations,
    listMyChallengeHabits,
    listParticipants,
    recordProgress,
    rejectInvitation,
    updateChallenge,
} from './challenge.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', listChallenges);
router.post('/', createChallenge);
router.get('/invitations', listInvitations);
router.get('/my-habits', listMyChallengeHabits);
router.post('/invitations/:invitationId/accept', acceptInvitation);
router.post('/invitations/:invitationId/reject', rejectInvitation);
router.get('/:challengeId', getChallengeById);
router.patch('/:challengeId', updateChallenge);
router.delete('/:challengeId', deleteChallenge);
router.post('/:challengeId/invitations', createInvitation);
router.post('/:challengeId/join', joinChallenge);
router.post('/:challengeId/leave', leaveChallenge);
router.get('/:challengeId/participants', listParticipants);
router.post('/:challengeId/progress', recordProgress);
router.post('/:challengeId/reward', claimReward);

export default router;
