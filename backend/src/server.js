import config from '../config.js';
import connectDB from './config/database.js';
import createApp from './app.js';
import { startSchedulers } from './scheduler/index.js';


process.env.TZ = config.timezone;
console.log(`Application timezone: ${config.timezone} (local time now: ${new Date().toString()})`);

const app = createApp();
const PORT = config.port || 3000;

connectDB()
  .then(() => {
    console.log('Database initialization successful');
    startSchedulers();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB, exiting.');
    console.error(err.message);
    process.exit(1);
  });
