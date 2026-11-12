// Fail fast on a misconfigured environment instead of running insecurely.
function validateEnv() {
  const errors = [];

  if (!process.env.MONGO_URI) {
    errors.push("MONGO_URI is missing");
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push(
      "JWT_SECRET must be at least 32 characters (generate 64 random bytes, see .env.example)"
    );
  }

  try {
    new Intl.DateTimeFormat("en-CA", {
      timeZone: process.env.APP_TIMEZONE || "Asia/Karachi"
    });
  } catch {
    errors.push("APP_TIMEZONE is not a valid IANA timezone (e.g. Asia/Karachi)");
  }

  if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL) {
    errors.push("CLIENT_URL is required in production (CORS allow-list)");
  }

  if (errors.length) {
    throw new Error(errors.join("; "));
  }
}

module.exports = { validateEnv };
