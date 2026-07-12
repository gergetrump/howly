import cron from 'node-cron';
import {
    runDailyStreakMaintenance,
    sendStreakRepairReminders,
} from '../features/streakFreeze/streakFreeze.service.js';

/* Runs the daily streak-maintenance job once, logging its success or failure. */
async function runDaily() {
    try {
        const result = await runDailyStreakMaintenance();
        console.log('[cron] daily streak maintenance:', result);
    } catch (error) {
        console.error('[cron] daily streak maintenance failed:', error);
    }
}

/* Sends streak-repair reminder emails, logging only when any were sent or failed. */
async function runStreakReminders() {
    try {
        const result = await sendStreakRepairReminders();
        if (result.sent || result.failed) {
            console.log('[cron] streak reminder emails:', result);
        }
    } catch (error) {
        console.error('[cron] streak reminder emails failed:', error);
    }
}

/**
 * Start the streak-freeze background jobs. Call once after the DB is connected.
 * Jobs are idempotent, so the startup catch-up is safe on every restart.
 */
export function startSchedulers() {
    // Catch-up once on boot - covers a scheduled run missed during downtime.
    runDaily();
    runStreakReminders();

    // Daily streak maintenance - every day at 00:30 (server time).
    cron.schedule('30 0 * * *', runDaily);

    // Streak reminder emails - every 30 minutes, for deadlines within the next 2 hours.
    cron.schedule('*/30 * * * *', runStreakReminders);

    console.log('[cron] streak-freeze schedulers started');
}
