// Vercel serverless entry: poori Express app ek function ke andar chalti hai.
// (Local par aap ab bhi `npm run dev` / server.js hi istemal karein.)
const mongoose = require("mongoose");
const { validateEnv } = require("../config/env");

let app;
let connecting = null;

// MongoDB se connection ek dafa banta hai aur agli requests mein dobara istemal hota hai
async function ensureReady() {
  validateEnv();

  const state = mongoose.connection.readyState;
  if (state === 0) connecting = null; // purana connection toot gaya ho to dobara banao

  if (state !== 1) {
    if (!connecting) {
      mongoose.set("strictQuery", true);
      connecting = mongoose
        .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
        .catch((err) => {
          connecting = null;
          throw err;
        });
    }
    await connecting;
  }

  // App env validate hone ke baad load hoti hai (server.js ki tarah)
  if (!app) app = require("../app");
  return app;
}

module.exports = async (req, res) => {
  try {
    const expressApp = await ensureReady();
    return expressApp(req, res);
  } catch (err) {
    console.error("Startup error:", err.message);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, message: "Server configuration or database error" }));
  }
};
