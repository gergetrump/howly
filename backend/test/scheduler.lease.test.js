import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import connectDB from '../src/config/database.js';
import {
    SchedulerLease,
    schedulerPeriod,
    withSchedulerLease,
} from '../src/scheduler/lease.js';

let mongo;

before(async () => {
    mongo = await MongoMemoryServer.create();
    await connectDB(mongo.getUri());
});

afterEach(async () => {
    await SchedulerLease.deleteMany({});
});

after(async () => {
    await mongoose.disconnect();
    if (mongo) {
        await mongo.stop();
    }
});

test('schedulerPeriod buckets a day and a half hour in the app timezone', () => {
    const now = new Date('2026-01-15T23:45:00.000Z');
    assert.equal(schedulerPeriod('daily', now, 'Europe/Berlin'), '2026-01-16');
    assert.equal(schedulerPeriod('reminders', now, 'Europe/Berlin'), '2026-01-16T00:30');
    assert.equal(
        schedulerPeriod('reminders', new Date('2026-01-15T23:10:00.000Z'), 'Europe/Berlin'),
        '2026-01-16T00:00',
    );
});

test('withSchedulerLease runs a period once and skips the second caller', async () => {
    const now = new Date('2026-06-01T12:00:00.000Z');
    let runs = 0;
    const first = await withSchedulerLease('daily', now, async () => {
        runs += 1;
        return { ok: true };
    });
    const second = await withSchedulerLease('daily', now, async () => {
        runs += 1;
        return { ok: false };
    });

    assert.equal(first.leased, true);
    assert.deepEqual(first.result, { ok: true });
    assert.equal(second.leased, false);
    assert.equal(second.result, null);
    assert.equal(runs, 1);
});

test('withSchedulerLease releases the period when the job throws', async () => {
    const now = new Date('2026-06-02T12:00:00.000Z');
    await assert.rejects(
        withSchedulerLease('reminders', now, async () => {
            throw new Error('mail down');
        }),
        /mail down/,
    );

    const retry = await withSchedulerLease('reminders', now, async () => 'sent');
    assert.equal(retry.leased, true);
    assert.equal(retry.result, 'sent');
});

test('withSchedulerLease releases the period on SIGTERM', async () => {
    const now = new Date('2026-06-03T12:00:00.000Z');
    const period = schedulerPeriod('daily', now, 'Europe/Berlin');
    const originalExit = process.exit;
    const priorTerm = new Set(process.listeners('SIGTERM'));
    const priorInt = new Set(process.listeners('SIGINT'));
    let exitCode = null;
    process.exit = ((code) => {
        exitCode = code ?? 0;
    });

    try {
        const running = withSchedulerLease('daily', now, () => new Promise(() => {}), {
            releaseOnSignal: true,
        });
        for (let attempt = 0; attempt < 50; attempt += 1) {
            const held = await SchedulerLease.exists({ _id: `daily:${period}` });
            const listening = process.listeners('SIGTERM').some((listener) => !priorTerm.has(listener));
            if (held && listening) {
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 20));
        }
        assert.equal(
            process.listeners('SIGTERM').some((listener) => !priorTerm.has(listener)),
            true,
        );
        process.emit('SIGTERM');
        for (let attempt = 0; attempt < 50; attempt += 1) {
            const held = await SchedulerLease.exists({ _id: `daily:${period}` });
            if (!held) {
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 20));
        }

        const retry = await withSchedulerLease('daily', now, async () => 'retried');
        assert.equal(retry.leased, true);
        assert.equal(retry.result, 'retried');
        assert.equal(exitCode, 1);
        running.catch(() => {});
    } finally {
        process.exit = originalExit;
        for (const listener of process.listeners('SIGTERM')) {
            if (!priorTerm.has(listener)) {
                process.off('SIGTERM', listener);
            }
        }
        for (const listener of process.listeners('SIGINT')) {
            if (!priorInt.has(listener)) {
                process.off('SIGINT', listener);
            }
        }
    }
});
