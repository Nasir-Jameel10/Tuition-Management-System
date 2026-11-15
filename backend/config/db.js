const mongoose = require("mongoose");

async function connectDB(uri = process.env.MONGO_URI) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log("MongoDB connected successfully");
}

// Serverless (Vercel) ke liye: connection ek dafa banta hai aur agli requests mein dobara istemal hota hai
let connecting = null;

async function connectOnce(uri = process.env.MONGO_URI) {
  const state = mongoose.connection.readyState;
  if (state === 1) return;
  if (state === 0) connecting = null; // purana connection toot gaya ho to dobara banao

  if (!connecting) {
    mongoose.set("strictQuery", true);
    connecting = mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 }).catch((err) => {
      connecting = null;
      throw err;
    });
  }
  await connecting;
}

module.exports = connectDB;
module.exports.connectOnce = connectOnce;
