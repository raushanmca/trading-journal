const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not configured");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
    mongoose.connection.on("error", (error) => {
      console.error("❌ MongoDB connection error:", error.message);
    });
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
    });
  } catch (error) {
    console.error("❌ DB Error:", error.message);
    throw error;
  }
};

module.exports = connectDB;
