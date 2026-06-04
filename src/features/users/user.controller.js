import * as userService from './user.service.js';
import { validateUpdateUserInput, validateUserId } from './user.validation.js';

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

export async function uploadCurrentUserProfilePicture(req, res) {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;

    const user = await userService.updateUserProfilePicture(
        req.user.id,
        profilePictureUrl
    );

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
        message: 'Profile picture uploaded successfully',
        user: userService.toPublicUser(user),
    });
}

export async function deleteCurrentUserProfilePicture(req, res) {
    const user = await userService.resetUserProfilePicture(req.user.id);

    if (!user) {
        return notFound(res);
    }

    return res.status(200).json({
        user: userService.toPublicUser(user),
    });
}