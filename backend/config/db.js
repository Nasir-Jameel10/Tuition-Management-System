const mongoose = require("mongoose");

async function connectDB(uri = process.env.MONGO_URI) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log("MongoDB connected successfully");
}

module.exports = connectDB;
