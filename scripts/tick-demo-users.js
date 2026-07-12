import mongoose from 'mongoose';
import connectDB from '../src/config/database.js';
import { assertDemoSeedAllowed } from './demo-users/shared.js';
import { parseTickArgs, printTickHelp, tickDemoUsers } from './demo-users/tick.js';

async function main() {
    const options = parseTickArgs();

    if (options.help) {
        printTickHelp();
        return;
    }

    assertDemoSeedAllowed();
    await connectDB();

    const stats = await tickDemoUsers({ dryRun: options.dryRun });

    if (stats.demoUsers === 0) {
        console.log('No demo users found. Run "npm run seed:demo-users" first.');
        return;
    }

    const mode = stats.dryRun ? 'DRY RUN' : 'LIVE';
    console.log(`Demo tick complete (${mode}) for ${stats.dateKey}`);
    console.log(`  Demo users:         ${stats.demoUsers}`);
    console.log(`  Habits seen:        ${stats.habitsSeen}`);
    console.log(`  Already completed:  ${stats.alreadyCompleted}`);
    console.log(`  Skipped (realistic): ${stats.skipped}`);

    if (stats.dryRun) {
        console.log(`  Would complete:     ${stats.planned}`);
    } else {
        console.log(`  Completed now:      ${stats.completed}`);
        console.log(`  Failed:             ${stats.failed}`);
    }

    if (stats.errors.length > 0) {
        console.log('\nErrors:');
        for (const error of stats.errors) {
            console.log(`  ${error.user} / ${error.habitId}: ${error.message}`);
        }
    }
}

main()
    .catch((error) => {
        console.error('Demo tick failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
