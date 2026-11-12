// Central error handling. Express 5 forwards errors from async route handlers
// here automatically, so routes can simply `throw`.

const notFound = (req, res) => {
  res.status(404).json({ success: false, message: "API route not found" });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.name === "HttpError") {
    return res
      .status(err.status)
      .json({ success: false, message: err.message, ...err.extra });
  }

  // body-parser errors (malformed JSON, payload too large)
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON in request body" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body is too large" });
  }

  if (err.name === "ValidationError" && err.errors) {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: errors.join(", "), errors });
  }

  if (err.name === "CastError") {
    return res
      .status(400)
      .json({ success: false, message: `Invalid value for "${err.path}"` });
  }

  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: "A duplicate record already exists" });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({ success: false, message: "Something went wrong on the server" });
};

module.exports = { notFound, errorHandler };
