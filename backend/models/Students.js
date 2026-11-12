const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
      maxlength: 100
    },

    fatherName: {
      type: String,
      required: [true, "Father name is required"],
      trim: true,
      maxlength: 100
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address"
      ]
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      maxlength: 20
    },

    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
      validate: {
        validator: function (value) {
          return value <= new Date();
        },
        message: "Date of birth cannot be in the future"
      }
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: [true, "Gender is required"]
    },

    className: {
      type: String,
      required: [true, "Class is required"],
      trim: true,
      maxlength: 30
    },

    section: {
      type: String,
      trim: true,
      default: "A",
      maxlength: 20
    },

    subjects: {
      type: [{
        type: String,
        trim: true
      }],
      default: []
    },

    monthlyFee: {
      type: Number,
      required: [true, "Monthly fee is required"],
      min: [0, "Monthly fee cannot be negative"]
    },

    joiningDate: {
      type: Date,
      default: Date.now
    },

    photo: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    }
  },
  {
    timestamps: true
  }
);

// Avoid OverwriteModelError during development
module.exports =
  mongoose.models.Student ||
  mongoose.model("Student", studentSchema);