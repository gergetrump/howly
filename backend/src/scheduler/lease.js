import mongoose from 'mongoose';
import config from '../../config.js';

const leaseSchema = new mongoose.Schema(
    {
        _id: { type: String },
        lockedAt: { type: Date, required: true },
    },
    { collection: 'scheduler_leases', versionKey: false },
);

export const SchedulerLease = mongoose.models.SchedulerLease
    || mongoose.model('SchedulerLease', leaseSchema);

function part(parts, type) {
    return parts.find((entry) => entry.type === type)?.value;
}

/* Calendar day for the daily job, and a 30-minute bucket for reminder mail. */
export function schedulerPeriod(job, now = new Date(), timeZone = config.timezone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(now);
    const day = `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}`;
    if (job === 'daily') {
        return day;
    }

    let hour = part(parts, 'hour');
    if (hour === '24') {
        hour = '00';
    }
    const minute = Number(part(parts, 'minute')) < 30 ? '00' : '30';
    return `${day}T${hour}:${minute}`;
}

/**
 * Run fn once per job and period. A duplicate insert loses the lease.
 * A thrown error deletes the lease so a retry can take it.
 * releaseOnSignal does the same on SIGTERM, which is how a fence stops a running task.
 * The API process does not set that option.
 */
export async function withSchedulerLease(job, now, fn, options = {}) {
    const period = schedulerPeriod(job, now);
    const id = `${job}:${period}`;
    const releaseOnSignal = options.releaseOnSignal === true;

    try {
        await SchedulerLease.create({ _id: id, lockedAt: new Date() });
    } catch (error) {
        if (error?.code === 11000) {
            return { leased: false, period, result: null };
        }
        throw error;
    }

    let settled = false;
    const release = async () => {
        if (settled) {
            return;
        }
        settled = true;
        await SchedulerLease.deleteOne({ _id: id });
    };
    const onStop = () => {
        release().finally(() => process.exit(1));
    };
    if (releaseOnSignal) {
        process.once('SIGTERM', onStop);
        process.once('SIGINT', onStop);
    }
    const clearStop = () => {
        if (!releaseOnSignal) {
            return;
        }
        process.off('SIGTERM', onStop);
        process.off('SIGINT', onStop);
    };

    try {
        const result = await fn();
        settled = true;
        clearStop();
        return { leased: true, period, result };
    } catch (error) {
        clearStop();
        await release();
        throw error;
    }
}
