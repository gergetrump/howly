import * as userService from './user.service.js';
import {
    validateSearchUsersInput,
    validateUpdateUserInput,
    validateUserId,
} from './user.validation.js';

const badRequest = (res, message) => res.status(400).json({ message });
const notFound = (res) => res.status(404).json({ message: 'User not found' });

// Return the authenticated user's public profile.
export async function getCurrentUser(req, res) {
    const { error } = validateUserId(req.user?.id);

    if (error) {
        return badRequest(res, error);
    }

    const user = await userService.getUserById(req.user.id);

    if (!user) {
        return notFound(res);
    }

    return res.status(200).json(userService.toPublicUser(user));
}

export async function searchUsers(req, res) {
    const { error, value } = validateSearchUsersInput(req.query);

    if (error) {
        return badRequest(res, error);
    }

    const users = await userService.searchUsersByUsername({
        query: value.query,
        currentUserId: req.user.id,
    });

    return res.status(200).json(users);
}

// Update allowed fields for the authenticated user.
export async function updateCurrentUser(req, res) {
    const { error: idError } = validateUserId(req.user?.id);

    if (idError) {
        return badRequest(res, idError);
    }

    const { error, value } = validateUpdateUserInput(req.body);

    if (error) {
        return badRequest(res, error);
    }

    const { user, error: serviceError } = await userService.updateUserById(
        req.user.id,
        value
    );

    if (serviceError) {
        return badRequest(res, serviceError);
    }

    if (!user) {
        return notFound(res);
    }

    return res.status(200).json(userService.toPublicUser(user));
}

export async function deleteCurrentUser(req, res) {
    const { error } = validateUserId(req.user?.id);

    if (error) {
        return badRequest(res, error);
    }

    const user = await userService.softDeleteUser(req.user.id);

    if (!user) {
        return notFound(res);
    }

    return res.status(204).send();
}
