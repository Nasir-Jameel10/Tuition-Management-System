const express = require("express");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");
const HttpError = require("../utils/httpError");
const { isId, pick, asString, parsePagination, escapeRegex } = require("../utils/helpers");

const router = express.Router();

// User management is Admin-only
router.use(protect, authorize("Admin"));

// List users
router.get("/", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = {};

  const role = asString(req.query.role);
  if (role) filter.role = role;

  const search = asString(req.query.search);
  if (search) {
    const safe = escapeRegex(search);
    filter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { email: { $regex: safe, $options: "i" } }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);

  res.json({
    success: true,
    users,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  });
});

// Update a user: name, phone, role, enable/disable
router.patch("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw new HttpError(400, "Invalid user ID");

  const updates = pick(req.body, ["name", "phone", "role", "isActive"]);

  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, "No valid fields provided");
  }

  if (updates.isActive !== undefined && typeof updates.isActive !== "boolean") {
    throw new HttpError(400, "isActive must be true or false");
  }

  // Stop an admin from locking themselves out
  if (req.params.id === req.user._id.toString()) {
    if (updates.isActive === false) {
      throw new HttpError(400, "You cannot disable your own account");
    }
    if (updates.role !== undefined && updates.role !== req.user.role) {
      throw new HttpError(400, "You cannot change your own role");
    }
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!user) throw new HttpError(404, "User not found");

  res.json({ success: true, user });
});

module.exports = router;
