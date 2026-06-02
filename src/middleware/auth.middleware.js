import jwt from 'jsonwebtoken';

// Read the signing secret once per request path.
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error('JWT_SECRET is missing in .env');
    }

    return secret;
}

// Require a valid bearer token and attach the user claims to req.user.
export function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');

    if (!token) {
        return res.status(401).json({ message: 'Missing bearer token' });
    }

    try {
        const payload = jwt.verify(token, getJwtSecret());
        req.user = {
            id: payload.sub,
            role: payload.role,
        };
        return next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}
