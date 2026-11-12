const rateLimit = require("express-rate-limit");

const message = (text) => ({ success: false, message: text });

// General protection for the whole API.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("Too many requests. Please try again later.")
});

// Strict limit on login attempts (only failed attempts count).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("Too many login attempts. Please try again in 15 minutes.")
});

// Public sign-up: spam accounts rokne ke liye (har request count hoti hai).
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("Too many sign-up requests. Please try again in an hour.")
});

module.exports = { apiLimiter, loginLimiter, signupLimiter };
