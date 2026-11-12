const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");
const { loginLimiter, signupLimiter } = require("../middleware/rateLimiter");
const HttpError = require("../utils/httpError");
const { passwordProblem } = require("../utils/helpers");

const router = express.Router();

const ROLES = ["Admin", "Teacher"];

const generateToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1d"
  });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role
});

// A real bcrypt hash (same cost as real passwords) used to keep login timing
// the same whether or not the email exists.
const dummyHash = bcrypt.hash("timing-equalizer-not-a-real-password", 12);

// REGISTER a new user (Admin only - there is no public sign-up)
router.post("/register", protect, authorize("Admin"), async (req, res) => {
  const { name, email, password, phone } = req.body || {};
  const role = req.body && req.body.role !== undefined ? req.body.role : "Teacher";

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    !name.trim() ||
    !email.trim()
  ) {
    throw new HttpError(400, "Name, email and password are required.");
  }

  const problem = passwordProblem(password);
  if (problem) throw new HttpError(400, problem);

  if (!ROLES.includes(role)) {
    throw new HttpError(400, `Role must be one of: ${ROLES.join(", ")}`);
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (await User.findOne({ email: normalizedEmail })) {
    throw new HttpError(409, "An account with this email already exists.");
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    phone: typeof phone === "string" ? phone : "",
    role
  });

  res.status(201).json({
    success: true,
    message: `${user.role} account created successfully.`,
    user: publicUser(user)
  });
});

// PUBLIC SIGN-UP: account hamesha "Teacher" banta hai aur Disabled (pending) rehta hai
// jab tak Admin Users page se approve na kare. Public raaste se Admin nahi bana ja sakta.
router.post("/signup", signupLimiter, async (req, res) => {
  const { name, email, password, phone } = req.body || {};

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    !name.trim() ||
    !email.trim()
  ) {
    throw new HttpError(400, "Name, email and password are required.");
  }

  const problem = passwordProblem(password);
  if (problem) throw new HttpError(400, problem);

  const normalizedEmail = email.trim().toLowerCase();

  // Email pehle se ho ya na ho, jawab ek jaisa dete hain taake koi emails ka pata na laga sake
  const reply = () =>
    res.status(202).json({
      success: true,
      message: "Signup request mil gayi. Admin ke approve karne ke baad aap login kar sakenge."
    });

  if (await User.findOne({ email: normalizedEmail })) return reply();

  try {
    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: typeof phone === "string" ? phone : "",
      role: "Teacher",
      isActive: false
    });
  } catch (err) {
    if (err.code !== 11000) throw err; // do requests ek saath aayi hon to duplicate ignore
  }

  reply();
});

// LOGIN
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    throw new HttpError(400, "Email and password are required.");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");

  let passwordOk = false;

  if (user) {
    passwordOk = await user.comparePassword(password);
  } else {
    // Burn the same time as a real check so response time doesn't reveal emails
    await bcrypt.compare(password, await dummyHash);
  }

  if (!passwordOk) {
    throw new HttpError(401, "Invalid email or password.");
  }

  if (!user.isActive) {
    throw new HttpError(403, "Aapka account abhi active nahi hai. Admin ke approval ka intezar karein ya Admin se rabta karein.");
  }

  res.status(200).json({
    success: true,
    message: "Login successful.",
    token: generateToken(user),
    user: publicUser(user)
  });
});

// CURRENT USER PROFILE
router.get("/me", protect, (req, res) => {
  res.status(200).json({ success: true, user: publicUser(req.user) });
});

// CHANGE OWN PASSWORD (old tokens stop working, a fresh token is returned)
router.patch("/change-password", protect, loginLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (typeof currentPassword !== "string" || !currentPassword) {
    throw new HttpError(400, "Current password is required.");
  }

  const problem = passwordProblem(newPassword);
  if (problem) throw new HttpError(400, problem);

  if (newPassword === currentPassword) {
    throw new HttpError(400, "New password must be different from the current one.");
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.comparePassword(currentPassword))) {
    throw new HttpError(401, "Current password is incorrect.");
  }

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: "Password changed successfully.",
    token: generateToken(user)
  });
});

module.exports = router;
