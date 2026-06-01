import mongoose from 'mongoose';

// Connect to MongoDB using env config or an override URI (tests).
async function connectDB(uriOverride) {
  const uri = uriOverride || process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is missing in .env');
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