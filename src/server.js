import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/database.js';
import habitRoutes from './features/habits/habit.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Habit routes
app.use('/api/habits', habitRoutes);

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
