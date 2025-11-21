// config/db.js or wherever your database connection is
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Remove deprecated options and use modern ones
    const conn = await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      // Remove these deprecated options:
      // bufferCommands: false,
      // bufferMaxEntries: 0,
      // useNewUrlParser: true, // No longer needed in Mongoose 6+
      // useUnifiedTopology: true, // No longer needed in Mongoose 6+

      // Add these modern options instead:
      maxPoolSize: 10, // Maximum number of sockets in the connection pool
      minPoolSize: 5, // Minimum number of sockets in the connection pool
      maxIdleTimeMS: 30000, // How long a connection can be idle before being closed
      waitQueueTimeoutMS: 10000, // How long to wait for a connection from the pool
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
    });

    mongoose.connection.on("connected", () => {
      console.log("✅ MongoDB connected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB reconnected");
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);

    // More specific error messages
    if (error.name === "MongoParseError") {
      console.error(
        "🔧 Configuration error: Check your connection string and options"
      );
    } else if (error.name === "MongoNetworkError") {
      console.error(
        "🌐 Network error: Check if MongoDB is running and accessible"
      );
    } else if (error.name === "MongoServerSelectionError") {
      console.error(
        "🔌 Server selection error: Cannot connect to MongoDB server"
      );
    }

    process.exit(1);
  }
};

export default connectDB;
