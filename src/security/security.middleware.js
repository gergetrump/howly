import helmet from 'helmet';

const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MONGO_OPERATOR_KEY_PATTERN = /[$.]/;

// Security stays as a separate app layer: headers reduce XSS impact, and unsafe
// request keys are rejected before feature controllers build Mongo queries.
const HELMET_OPTIONS = {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            connectSrc: ["'self'", 'http://localhost:5173', 'http://127.0.0.1:5173'],
            upgradeInsecureRequests: null,
        },
    },
};

function isPlainObject(value) {
    return Boolean(value) && Object.prototype.toString.call(value) === '[object Object]';
}

function isUnsafeRequestKey(key) {
    // Mongo treats "$" and "." keys as operators/paths. Prototype keys can also
    // mutate object behavior if later merged, so user payloads cannot define them.
    return MONGO_OPERATOR_KEY_PATTERN.test(key) || PROTOTYPE_POLLUTION_KEYS.has(key);
}

function findUnsafeKey(value, path = 'request') {
    if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index += 1) {
            const unsafeKey = findUnsafeKey(value[index], `${path}[${index}]`);
            if (unsafeKey) {
                return unsafeKey;
            }
        }

        return null;
    }

    if (!isPlainObject(value)) {
        return null;
    }

    for (const [key, nestedValue] of Object.entries(value)) {
        if (isUnsafeRequestKey(key)) {
            return `${path}.${key}`;
        }

        const unsafeKey = findUnsafeKey(nestedValue, `${path}.${key}`);
        if (unsafeKey) {
            return unsafeKey;
        }
    }

    return null;
}

export function rejectUnsafeRequestKeys(req, res, next) {
    const unsafeKey =
        findUnsafeKey(req.body, 'body') ||
        findUnsafeKey(req.query, 'query') ||
        findUnsafeKey(req.params, 'params');

    if (unsafeKey) {
        return res.status(400).json({
            code: 'SECURITY_INVALID_REQUEST',
            message: 'Request contains unsupported field names.',
        });
    }

    return next();
}

export function applySecurityMiddleware(app) {
    // XSS protection is layered: React renders user text safely, and CSP tells
    // browsers not to run unexpected scripts if unsafe markup ever slips in.
    app.use(helmet(HELMET_OPTIONS));
}
