import config from '../config.js';
import connectDB from './config/database.js';
import createApp from './app.js';
import { startSchedulers } from './scheduler/index.js';
import { productionConfigError, warnAboutProductionLimits } from './startup.js';

const configError = productionConfigError();
if (configError) {
  console.error(configError);
  process.exit(1);
}

warnAboutProductionLimits();

process.env.TZ = config.timezone;
console.log(`Application timezone: ${config.timezone} (local time now: ${new Date().toString()})`);

const app = createApp();
const PORT = config.port || 3000;

connectDB()
  .then(() => {
    console.log('Database initialization successful');
    if (config.runSchedulers) {
        startSchedulers();
    } else {
        console.log('[cron] streak schedulers run as separate tasks');
    }
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on port ${PORT}`);
    });

    function shutdown(signal) {
      console.log(`Received ${signal}, closing server`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 10_000);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB, exiting.');
    console.error(err.message);
    process.exit(1);
  });
