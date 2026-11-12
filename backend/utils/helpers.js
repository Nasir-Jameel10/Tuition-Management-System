const mongoose = require("mongoose");

// Strict check: a real ObjectId or a 24-char hex string (not any 12-char string).
const isId = (value) => mongoose.isObjectIdOrHexString(value);

// Copy only the allowed fields from an object.
function pick(source, fields) {
  const result = {};
  if (!source || typeof source !== "object") return result;

  for (const field of fields) {
    if (source[field] !== undefined) result[field] = source[field];
  }
  return result;
}

// Query-string values can be arrays or objects; only accept plain strings.
const asString = (value) => (typeof value === "string" ? value.trim() : undefined);

function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// bcrypt only uses the first 72 bytes, so longer passwords are rejected.
function passwordProblem(password) {
  if (typeof password !== "string" || !password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (Buffer.byteLength(password, "utf8") > 72) {
    return "Password must be at most 72 bytes.";
  }
  return null;
}

module.exports = { isId, pick, asString, parsePagination, escapeRegex, passwordProblem };
