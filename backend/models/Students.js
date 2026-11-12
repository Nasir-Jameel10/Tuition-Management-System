const mongoose = require("mongoose");

const wholeNumber = {
  validator: Number.isInteger,
  message: "{PATH} must be a whole number"
};

const studentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: [true, "Student name is required"], trim: true, maxlength: 100 },
    fatherName: { type: String, required: [true, "Father name is required"], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address"]
    },
    phone: { type: String, required: [true, "Phone number is required"], trim: true, maxlength: 20 },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
      validate: { validator: (v) => v <= new Date(), message: "Date of birth cannot be in the future" }
    },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: [true, "Gender is required"] },

    // Frontend (Dashboard/Students) reads student.class.name, so class is a reference.
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: [true, "Class is required"] },
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],

    // Whole rupees, because Fees.amount must be an integer
    monthlyFee: {
      type: Number,
      required: [true, "Monthly fee is required"],
      min: [0, "Monthly fee cannot be negative"],
      validate: wholeNumber
    },
    joiningDate: { type: Date, default: Date.now },
    photo: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
  },
  { timestamps: true }
);

studentSchema.index({ createdAt: -1 });
studentSchema.index({ status: 1, class: 1 });

module.exports = mongoose.models.Student || mongoose.model("Student", studentSchema);
