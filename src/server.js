import dotenv from 'dotenv';
import connectDB from './config/database.js';
import createApp from './app.js';

dotenv.config();

const app = createApp();
const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    console.log('Database initialization successful');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB, exiting.');
    console.error(err.message);
    process.exit(1);
  });
