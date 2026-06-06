/**
 * Wraps an async Express route handler so that rejected promises
 * are automatically forwarded to Express error handling via next().
 *
 * Usage:
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
