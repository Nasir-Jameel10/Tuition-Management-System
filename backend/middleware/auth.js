const jwt = require("jsonwebtoken");
const User = require("../models/User");

const unauthorized = (res, message) =>
  res.status(401).json({ success: false, message });

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return unauthorized(res, "Authentication required. Please log in.");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return unauthorized(res, "Token is missing");
    }

    // Pin the algorithm so a forged token can't pick a weaker one.
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"]
    });

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return unauthorized(res, "User not found or account is disabled");
    }

    // Tokens issued before the last password change are no longer valid.
    if (
      user.passwordChangedAt &&
      decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      return unauthorized(res, "Password was changed. Please log in again.");
    }

    req.user = user;
    next();
  } catch (error) {
    return unauthorized(res, "Invalid or expired token");
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource"
      });
    }

    next();
  };
};

module.exports = { protect, authorize };
