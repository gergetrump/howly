import mongoose from 'mongoose';
import { ApiError } from '../errors/ApiError.js';

/**
 * Central error-handling middleware.
 * Catches ApiErrors, Mongoose validation/cast errors, and unexpected errors,
 * then returns a consistent JSON response.
 */
export function errorMiddleware(err, req, res, _next) {
    // --- Mongoose Validation Errors ---
    if (err instanceof mongoose.Error.ValidationError) {
        const message = Object.values(err.errors)
            .map((e) => e.message)
            .join(', ');
        return res.status(400).json({
            timestamp: new Date().toISOString(),
            status: 400,
            error: 'Bad Request',
            message,
            errorCode: 'VALIDATION_ERROR',
            path: req.originalUrl,
        });
    }

    // --- Mongoose Cast Errors (e.g. invalid ObjectId) ---
    if (err instanceof mongoose.Error.CastError && err.kind === 'ObjectId') {
        return res.status(400).json({
            timestamp: new Date().toISOString(),
            status: 400,
            error: 'Bad Request',
            message: 'Invalid ID format',
            errorCode: 'VALIDATION_ERROR',
            path: req.originalUrl,
        });
    }

    // --- Known API errors ---
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            timestamp: new Date().toISOString(),
            status: err.statusCode,
            error: err.name,
            message: err.message,
            errorCode: err.errorCode,
            path: req.originalUrl,
        });
    }

    // --- Unexpected / unknown errors ---
    console.error('Unhandled error:', err);
    return res.status(500).json({
        timestamp: new Date().toISOString(),
        status: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred.',
        errorCode: 'INTERNAL_ERROR',
        path: req.originalUrl,
    });
}
