import cron from 'node-cron';
import {
    runDailyStreakMaintenance,
    sendStreakRepairReminders,
} from '../features/streakFreeze/streakFreeze.service.js';
import { withSchedulerLease } from './lease.js';

const jobs = {
    daily: runDailyStreakMaintenance,
    reminders: sendStreakRepairReminders,
};

/* One-shot entry used by EventBridge and by the in-process cron. */
export function runScheduledJob(job, now = new Date(), options = {}) {
    const fn = jobs[job];
    if (!fn) {
        throw new Error(`Unknown scheduler job: ${job}`);
    }
    return withSchedulerLease(job, now, () => fn(now), options);
}

/* Runs the daily streak-maintenance job once, logging its success or failure. */
async function runDaily() {
    try {
        const outcome = await runScheduledJob('daily');
        if (outcome.leased) {
            console.log('[cron] daily streak maintenance:', outcome.result);
        }
    } catch (error) {
        console.error('[cron] daily streak maintenance failed:', error);
    }
}

/* Sends streak-repair reminder emails, logging only when any were sent or failed. */
async function runStreakReminders() {
    try {
        const outcome = await runScheduledJob('reminders');
        if (outcome.leased && (outcome.result?.sent || outcome.result?.failed)) {
            console.log('[cron] streak reminder emails:', outcome.result);
        }
    } catch (error) {
        console.error('[cron] streak reminder emails failed:', error);
    }
}

/**
 * Start the streak-freeze background jobs. Call once after the DB is connected.
 * Production API tasks leave this off and run the same jobs from EventBridge.
 * A lease makes a second run in the same period a no-op.
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
