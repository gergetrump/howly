import * as challengeService from './challenge.service.js';
import {
    validateChallengeId,
    validateChallengeInvitationId,
    validateAcceptInvitationInput,
    validateCreateInvitationInput,
    validateCreateChallengeInput,
    validateJoinChallengeInput,
    validateListChallengesInput,
    validateRecordProgressInput,
    validateUpdateChallengeInput,
} from './challenge.validation.js';

const badRequest = (res, message, code) => res.status(400).json({
    message,
    ...(code ? { code } : {}),
});
const forbidden = (res) => res.status(403).json({ message: 'Forbidden' });
const notFound = (res) => res.status(404).json({ message: 'Challenge not found' });

function handleServiceResult(res, result, successStatus = 200) {
    if (result?.notFound) {
        return notFound(res);
    }

    if (result?.forbidden) {
        return forbidden(res);
    }

    if (result?.error) {
        return badRequest(res, result.error, result.code);
    }

    return res.status(successStatus).json(result);
}

export async function createChallenge(req, res) {
    const { error, value } = validateCreateChallengeInput(req.body);

    if (error) {
        return badRequest(res, error);
    }

    const result = await challengeService.createChallenge(value, req.user);

    return handleServiceResult(res, result, 201);
}

export async function listChallenges(req, res) {
    const { error, value } = validateListChallengesInput(req.query);

    if (error) {
        return badRequest(res, error);
    }

    const challenges = await challengeService.listChallenges(value, req.user);

    return res.status(200).json(challenges);
}

export async function getChallengeById(req, res) {
    const { error } = validateChallengeId(req.params.challengeId);

    if (error) {
        return badRequest(res, error);
    }

    const result = await challengeService.getChallengeById(req.params.challengeId, req.user);

    return handleServiceResult(res, result);
}

export async function updateChallenge(req, res) {
    const { error: idError } = validateChallengeId(req.params.challengeId);

    if (idError) {
        return badRequest(res, idError);
    }

    const { error, value } = validateUpdateChallengeInput(req.body);

    if (error) {
        return badRequest(res, error);
    }

    const result = await challengeService.updateChallenge(req.params.challengeId, value, req.user);

    return handleServiceResult(res, result);
}

export async function deleteChallenge(req, res) {
    const { error } = validateChallengeId(req.params.challengeId);

    if (error) {
        return badRequest(res, error);
    }

    const result = await challengeService.deleteChallenge(req.params.challengeId, req.user);

    if (result?.notFound) {
        return notFound(res);
    }

    if (result?.forbidden) {
        return forbidden(res);
    }

    return res.status(204).send();
}

export async function joinChallenge(req, res) {
    const { error } = validateChallengeId(req.params.challengeId);

    if (error) {
        return badRequest(res, error);
    }

    const { error: bodyError, value } = validateJoinChallengeInput(req.body);

    if (bodyError) {
        return badRequest(res, bodyError);
    }

    const result = await challengeService.joinChallenge(req.params.challengeId, req.user, value);

    return handleServiceResult(res, result, 201);
}

export async function createInvitation(req, res) {
    const { error: idError } = validateChallengeId(req.params.challengeId);

    if (idError) {
        return badRequest(res, idError);
    }

    const { error, value } = validateCreateInvitationInput(req.body);

    if (error) {
        return badRequest(res, error);
    }

    const result = await challengeService.createInvitation(
        req.params.challengeId,
        value.inviteeId,
        req.user
    );

    return handleServiceResult(res, result, 201);
}

export async function listInvitations(req, res) {
    const invitations = await challengeService.listInvitations(req.user.id);

    return res.status(200).json(invitations);
}

export async function acceptInvitation(req, res) {
    const { error } = validateChallengeInvitationId(req.params.invitationId);

    if (error) {
        return badRequest(res, error);
    }

    const { error: bodyError, value } = validateAcceptInvitationInput(req.body);

    if (bodyError) {
        return badRequest(res, bodyError);
    }

    const result = await challengeService.acceptInvitation(req.params.invitationId, req.user, value);

    return handleServiceResult(res, result);
}

export async function rejectInvitation(req, res) {
    const { error } = validateChallengeInvitationId(req.params.invitationId);

    if (error) {
        return badRequest(res, error);
    }

    const result = await challengeService.rejectInvitation(req.params.invitationId, req.user);

    return handleServiceResult(res, result);
}

export async function leaveChallenge(req, res) {
    const { error } = validateChallengeId(req.params.challengeId);

    if (error) {
        return badRequest(res, error);
    }

    const result = await challengeService.leaveChallenge(req.params.challengeId, req.user.id);

    return handleServiceResult(res, result);
}

export async function listParticipants(req, res) {
    const { error } = validateChallengeId(req.params.challengeId);

    if (error) {
        return badRequest(res, error);
    }

    const result = await challengeService.listParticipants(req.params.challengeId, req.user);

    return handleServiceResult(res, result);
}

export async function recordProgress(req, res) {
    const { error: idError } = validateChallengeId(req.params.challengeId);

    if (idError) {
        return badRequest(res, idError);
    }

    const { error, value } = validateRecordProgressInput(req.body);

    if (error) {
        return badRequest(res, error);
    }

    const result = await challengeService.recordProgress(req.params.challengeId, req.user.id, value);

    return handleServiceResult(res, result);
}

export async function claimReward(req, res) {
    const { error } = validateChallengeId(req.params.challengeId);

    if (error) {
        return badRequest(res, error);
    }

    const result = await challengeService.claimReward(req.params.challengeId, req.user.id);

    return handleServiceResult(res, result);
}
