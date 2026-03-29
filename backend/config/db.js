const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ DB Error:", error.message);
    console.warn("⚠️ Continuing without MongoDB. Auth routes can still work, but journal data will be unavailable until the database connects.");
  }
};

module.exports = connectDB;
