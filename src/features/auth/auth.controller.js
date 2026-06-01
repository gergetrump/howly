import {
    authenticateLocalUser,
    getUserById,
    registerLocalUser,
    signAccessToken,
    toPublicUser,
} from './auth.service.js';
import { validateLoginInput, validateRegisterInput } from './auth.validation.js';

const badRequest = (res, message) => res.status(400).json({ message });
const unauthorized = (res, message) => res.status(401).json({ message });

// Register a new local user and return an access token.
export async function register(req, res) {
    const { error, value } = validateRegisterInput(req.body);

    if (error) {
        return badRequest(res, error);
    }

    const { user, error: serviceError } = await registerLocalUser(value);

    if (serviceError) {
        return badRequest(res, serviceError);
    }

    const token = signAccessToken(user);

    return res.status(201).json({ user: toPublicUser(user), token });
}

// Authenticate a local user and return an access token.
export async function login(req, res) {
    const { error, value } = validateLoginInput(req.body);

    if (error) {
        return badRequest(res, error);
    }

    const { user, error: serviceError } = await authenticateLocalUser(value);

    if (serviceError) {
        return unauthorized(res, serviceError);
    }

    const token = signAccessToken(user);

    return res.status(200).json({ user: toPublicUser(user), token });
}

// Return the current authenticated user.
export async function getMe(req, res) {
    const user = await getUserById(req.user.id);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(toPublicUser(user));
}

// Log out by instructing the client to discard its token.
export async function logout(req, res) {
    return res.status(204).send();
}
