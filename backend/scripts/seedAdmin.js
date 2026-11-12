// Creates the first Admin account (or promotes an existing user to Admin).
// Usage:
//   ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='a-strong-password' ADMIN_NAME='Owner' npm run seed:admin
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const connectDB = require("../config/db");
const User = require("../models/User");
const { passwordProblem } = require("../utils/helpers");

async function run() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = (process.env.ADMIN_NAME || "Administrator").trim();

  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing in .env");
  if (!email) throw new Error("Set ADMIN_EMAIL");

  await connectDB();

  const existing = await User.findOne({ email });

  if (existing) {
    existing.role = "Admin";
    existing.isActive = true;
    await existing.save();
    console.log(`Existing user ${email} is now an active Admin (password unchanged).`);
    return;
  }

  const problem = passwordProblem(password);
  if (problem) throw new Error(`ADMIN_PASSWORD: ${problem}`);

  await User.create({ name, email, password, role: "Admin" });
  console.log(`Admin account created for ${email}.`);
}

run()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
