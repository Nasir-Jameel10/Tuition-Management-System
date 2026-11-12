require("dotenv").config();
const mongoose = require("mongoose");

const { validateEnv } = require("./config/env");
const connectDB = require("./config/db");

async function startServer() {
  try {
    validateEnv();
    await connectDB();

    // Load the app after env validation so config is guaranteed to be present
    const app = require("./app");
    const PORT = process.env.PORT || 5000;

    const server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

    // Graceful shutdown: stop accepting requests, then close the DB connection
    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down...`);
      server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Server startup error:", error.message);
    process.exit(1);
  }
}

startServer();
