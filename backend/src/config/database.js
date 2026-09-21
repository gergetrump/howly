import mongoose from 'mongoose';
import config from '../../config.js';

// Connect to MongoDB using committed config or an override URI (tests).
async function connectDB(uriOverride) {
  const uri = uriOverride || config.mongoUri;

    if (!uri) {
    throw new Error('MONGO_URI is missing. Copy backend/.env.example to backend/.env.');
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:');
    console.error(err.message);
    throw err;
  }
}

export default connectDB;