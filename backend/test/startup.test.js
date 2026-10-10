import test from 'node:test';
import assert from 'node:assert/strict';
import { productionConfigError } from '../src/startup.js';

test('production rejects placeholder JWT secrets', () => {
    const error = productionConfigError(
        { jwtSecret: 'replace-with-a-long-random-string' },
        { NODE_ENV: 'production' },
    );

    assert.match(error, /JWT_SECRET/);
});

test('production rejects short JWT secrets', () => {
    const error = productionConfigError(
        { jwtSecret: 'short-secret' },
        { NODE_ENV: 'production' },
    );

    assert.match(error, /JWT_SECRET/);
});

test('production accepts a long unique JWT secret', () => {
    const error = productionConfigError(
        { jwtSecret: 'a'.repeat(32) },
        { NODE_ENV: 'production' },
    );

    assert.equal(error, null);
});

test('development allows the local JWT secret', () => {
    const error = productionConfigError(
        { jwtSecret: 'dev-only-change-me' },
        { NODE_ENV: 'development' },
    );

    assert.equal(error, null);
});
