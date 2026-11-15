const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");

const { apiLimiter } = require("./middleware/rateLimiter");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// Behind a reverse proxy (Nginx, Render, Railway...) set TRUST_PROXY=1 so
// rate limiting sees the real client IP.
const proxyHops = parseInt(process.env.TRUST_PROXY, 10);
if (proxyHops > 0) app.set("trust proxy", proxyHops);

app.disable("x-powered-by");
app.use(helmet());

// Only allow the frontend origin(s) listed in CLIENT_URL (comma separated)
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

// Vercel (serverless) par server.js nahi chalta, is liye har request se pehle DB connection yaqini banao
if (process.env.VERCEL) {
  const { connectOnce } = require("./config/db");
  app.use(async (req, res, next) => {
    try {
      await connectOnce();
      next();
    } catch (err) {
      console.error("DB connect error:", err.message);
      next(err);
    }
  });
}

// Health check (not rate limited)
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Tuition Management System API is running",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  });
});

app.use("/api", apiLimiter);

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/students", require("./routes/studentRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/fees", require("./routes/feesRoutes"));
app.use("/api/classes", require("./routes/classRoutes"));
app.use("/api/subjects", require("./routes/subjectRoutes"));
app.use("/api/marks", require("./routes/markRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
