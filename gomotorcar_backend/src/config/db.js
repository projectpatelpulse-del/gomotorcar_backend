const mongoose = require("mongoose");

let cachedConnection = null;
let connectionPromise = null;

const connectDB = async () => {
  try {
    // Check env variable
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI environment variable missing");
      throw new Error("MONGO_URI environment variable missing");
    }

    // Reuse existing connection
    if (cachedConnection && mongoose.connection.readyState === 1) {
      return cachedConnection;
    }

    // Prevent multiple simultaneous connections
    if (!connectionPromise) {
      mongoose.set("bufferCommands", false);

      connectionPromise = mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 15000,
      });
    }

    const conn = await connectionPromise;

    cachedConnection = conn;

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Connection event listeners
    mongoose.connection.on("error", (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
    });

    return conn;

  } catch (error) {
    connectionPromise = null;

    console.error(`❌ Database Connection Error: ${error.message}`);

    process.exit(1);
  }
};

module.exports = connectDB;