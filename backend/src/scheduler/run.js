import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import { runScheduledJob } from './index.js';

const job = process.argv[2];
if (job !== 'daily' && job !== 'reminders') {
    console.error('Usage: node src/scheduler/run.js <daily|reminders>');
    process.exit(1);
}

connectDB()
    .then(() => runScheduledJob(job, new Date(), { releaseOnSignal: true }))
    .then(async (outcome) => {
        if (!outcome.leased) {
            console.log(`[cron] ${job} already ran for ${outcome.period}`);
        } else {
            console.log(`[cron] ${job} finished for ${outcome.period}:`, outcome.result);
        }
        await mongoose.disconnect();
    })
    .catch(async (error) => {
        console.error(`[cron] ${job} failed:`, error);
        await mongoose.disconnect().catch(() => {});
        process.exit(1);
    });
