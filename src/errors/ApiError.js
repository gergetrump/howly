/**
 * Custom API error class for consistent error handling across the app.
 *
 * Usage:
 *   throw ApiError.notFound('Habit not found.');
 *   throw ApiError.badRequest('Title is required.');
 *   throw new ApiError(409, 'CONFLICT', 'Resource already exists.');
 */
export class ApiError extends Error {
    constructor(statusCode, errorCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.name = 'ApiError';
    }

    static badRequest(message = 'Bad Request') {
        return new ApiError(400, 'BAD_REQUEST', message);
    }

    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, 'UNAUTHORIZED', message);
    }

    static forbidden(message = 'Forbidden') {
        return new ApiError(403, 'FORBIDDEN', message);
    }

    static notFound(message = 'Not Found') {
        return new ApiError(404, 'NOT_FOUND', message);
    }

    static conflict(message = 'Conflict') {
        return new ApiError(409, 'CONFLICT', message);
    }

    static internal(message = 'Internal Server Error') {
        return new ApiError(500, 'INTERNAL_ERROR', message);
    }
}
