const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Class name zaroori hai"], trim: true, unique: true },
    section: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", classSchema);