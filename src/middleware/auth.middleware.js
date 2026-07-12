import jwt from 'jsonwebtoken';
import config from '../../config.js';
import { hasPremiumAccess } from '../config/plans.js';
import User from '../features/users/user.model.js';

// Read the signing secret once per request path.
function getJwtSecret() {
    const secret = config.jwtSecret;

    if (!secret) {
        throw new Error('jwtSecret is missing in config.js');
    }

    return secret;
}

// Require a valid bearer token and attach the user claims to req.user.
export async function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');

    if (!token) {
        return res.status(401).json({ message: 'Missing bearer token' });
    }

    try {
        const payload = jwt.verify(token, getJwtSecret());
        const user = await User.findById(payload.sub).select('role isDeleted').lean();

        if (!user || user.isDeleted) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        req.user = {
            id: payload.sub,
            role: user.role,
        };
        return next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

export async function requirePremiumAccess(req, res, next) {
    try {
        const currentUser = await User.findById(req.user?.id)
            .select('role isPremium')
            .lean();

        if (!hasPremiumAccess(currentUser)) {
            return res.status(403).json({
                message: 'Premium is required for this feature.',
                code: 'PREMIUM_REQUIRED',
            });
        }

        return next();
    } catch (err) {
        return next(err);
    }
}
