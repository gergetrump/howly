import * as userService from './user.service.js';
<<<<<<< src/features/users/user.controller.js
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../cloudinary/cloudinary.service.js';
import { validateUpdateUserInput, validateUserId } from './user.validation.js';
import {
    validateSearchUsersInput,
    validateUpdateUserInput,
    validateUserId,
} from './user.validation.js';
>>>>>>> src/features/users/user.controller.js

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
<<<<<<< src/features/users/user.controller.js

export async function uploadCurrentUserProfilePicture(req, res) {
    try {
        if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, {
                folder: 'howly/profile-pictures',
                public_id: req.user.id,
                overwrite: true,
                resource_type: 'image',
                transformation: [
                    {
                        width: 400,
                        height: 400,
                        crop: 'fill',
                        gravity: 'face',
                    },
                ],
            });
            
    const user = await userService.updateUserProfilePicture(
        req.user.id,
        result.secure_url
    );

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
        message: 'Profile picture uploaded successfully',
        user: userService.toPublicUser(user),
    });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Failed to upload profile picture',
            error: error.message
        });
    }
    
}

export async function deleteCurrentUserProfilePicture(req, res) {
    try {
        await deleteFromCloudinary(`howly/profile-pictures/${req.user.id}`);

        const user = await userService.resetUserProfilePicture(req.user.id);

        if (!user) {
            return notFound(res);
        }

        return res.status(200).json({
            user: userService.toPublicUser(user),
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Failed to delete profile picture',
        });
    }
}
=======
>>>>>>> src/features/users/user.controller.js
