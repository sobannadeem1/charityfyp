// config/db.js or wherever your database connection is
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 30000, 
      socketTimeoutMS: 45000, 
    

      maxPoolSize: 10,
      minPoolSize: 5, 
      maxIdleTimeMS: 30000, 
      waitQueueTimeoutMS: 10000, 
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

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
