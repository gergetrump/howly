import cron from 'node-cron';
import {
    grantMonthlyShields,
    runDailyStreakMaintenance,
} from '../features/streakFreeze/streakFreeze.service.js';
import { resetMissedOverallStreaks } from '../features/habits/habit.service.js';

async function runDaily() {
    try {
        const result = await runDailyStreakMaintenance();
        console.log('[cron] daily streak maintenance:', result);
    } catch (error) {
        console.error('[cron] daily streak maintenance failed:', error);
    }

    try {
        const result = await resetMissedOverallStreaks();
        console.log('[cron] overall streak reset:', result);
    } catch (error) {
        console.error('[cron] overall streak reset failed:', error);
    }
}

async function runMonthly() {
    try {
        const result = await grantMonthlyShields();
        console.log('[cron] monthly shield grant:', result);
    } catch (error) {
        console.error('[cron] monthly shield grant failed:', error);
    }
}

/**
 * Start the streak-freeze background jobs. Call once after the DB is connected.
 * Jobs are idempotent, so the startup catch-up is safe on every restart.
 */
export function startSchedulers() {
    // Catch-up once on boot — covers a scheduled run missed during downtime.
    runDaily();

    // Daily streak maintenance — every day at 00:30 (server time).
    cron.schedule('30 0 * * *', runDaily);

    // Monthly premium shield grant — 1st of each month at 01:00.
    cron.schedule('0 1 1 * *', runMonthly);

    console.log('[cron] streak-freeze schedulers started');
}
