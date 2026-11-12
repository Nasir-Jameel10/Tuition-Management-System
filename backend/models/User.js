const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 100
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email"
      ]
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      maxlength: [72, "Password must be at most 72 characters"],
      select: false
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: ""
    },

    role: {
      type: String,
      enum: ["Admin", "Teacher"],
      default: "Teacher"
    },

    isActive: {
      type: Boolean,
      default: true
    },

    // Set when the password changes so older tokens can be rejected
    passwordChangedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);

  // Not for brand-new users: only invalidate tokens on a real password change
  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }
});

// Compare entered password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports =
  mongoose.models.User ||
  mongoose.model("User", userSchema);