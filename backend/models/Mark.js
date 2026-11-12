const mongoose = require("mongoose");

const markSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    testName: { type: String, required: [true, "Test name zaroori hai"], trim: true, maxlength: 100 },
    totalMarks: { type: Number, required: true, min: 1 },
    obtainedMarks: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Ek student ka ek test ek subject mein sirf ek baar
markSchema.index({ student: 1, subject: 1, testName: 1 }, { unique: true });

markSchema.pre("validate", function () {
  if (this.obtainedMarks > this.totalMarks) {
    this.invalidate("obtainedMarks", "Obtained marks total se zyada nahi ho sakte");
  }
});

markSchema.virtual("percentage").get(function () {
  return Math.round((this.obtainedMarks / this.totalMarks) * 1000) / 10;
});
markSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.models.Mark || mongoose.model("Mark", markSchema);
