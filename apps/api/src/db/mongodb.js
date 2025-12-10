import mongoose from "mongoose";

let isConnected = false;
let connectionPromise = null;

export async function connectMongoDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const mongodbUri = process.env.MONGODB_URI;

  if (!mongodbUri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  connectionPromise = mongoose
    .connect(mongodbUri, {
      serverSelectionTimeoutMS: 10000, // Increased for production reliability
      socketTimeoutMS: 45000,
      // Connection pooling for scalability
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2, // Minimum number of connections to maintain
      maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
      // Retry configuration
      retryWrites: true,
      w: 'majority',
      // Buffer commands if connection is down
      bufferCommands: true,
      bufferMaxEntries: 0, // Disable mongoose buffering (let errors through immediately)
    })
    .then(() => {
      isConnected = true;
      console.log("✅ Connected to MongoDB");
      console.log(`📊 Connection pool: max=${mongoose.connection.maxPoolSize || 'default'}, min=${mongoose.connection.minPoolSize || 'default'}`);
      return mongoose.connection;
    })
    .catch((error) => {
      console.error("❌ MongoDB connection error:", error.message);
      isConnected = false;
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
}

// Handle connection events
mongoose.connection.on("disconnected", () => {
  isConnected = false;
  connectionPromise = null;
  console.log("⚠️ MongoDB disconnected");
});

mongoose.connection.on("error", (error) => {
  console.error("❌ MongoDB error:", error.message);
  isConnected = false;
  connectionPromise = null;
});

mongoose.connection.on("reconnected", () => {
  isConnected = true;
  console.log("✅ MongoDB reconnected");
});

// Handle reconnection in serverless (Vercel) environments
mongoose.connection.on("close", () => {
  isConnected = false;
  connectionPromise = null;
  console.log("⚠️ MongoDB connection closed");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  if (isConnected) {
    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");
  }
  process.exit(0);
});

