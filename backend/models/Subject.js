const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Subject name zaroori hai"], trim: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subject", subjectSchema);