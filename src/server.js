import dotenv from 'dotenv';
import connectDB from './config/database.js';

dotenv.config();

connectDB()
  .then(() => {
    console.log('Database initialization successful');
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB, exiting.');
    console.error(err.message);
    process.exit(1);
  });