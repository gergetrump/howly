import mongoose from 'mongoose';
import config from '../../config.js';

// Connect to MongoDB using committed config or an override URI (tests).
async function connectDB(uriOverride) {
  const uri = uriOverride || config.mongoUri;

  if (!uri) {
    throw new Error('mongoUri is missing in config.js');
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