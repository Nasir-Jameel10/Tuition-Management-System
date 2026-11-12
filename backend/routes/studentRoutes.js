const express = require("express");
const mongoose = require("mongoose");
const Student = require("../models/Students");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

// Add student
router.post("/", authorize("Admin", "Teacher"), async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json({ success: true, student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get all students, with optional search and pagination
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = String(req.query.search || "").trim();

    const filter = {};

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { fullName: { $regex: safeSearch, $options: "i" } },
        { fatherName: { $regex: safeSearch, $options: "i" } },
        { className: { $regex: safeSearch, $options: "i" } },
        { phone: { $regex: safeSearch, $options: "i" } }
      ];
    }

    const [students, total] = await Promise.all([
      Student.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Student.countDocuments(filter)
    ]);

    res.json({
      success: true,
      students,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get one student
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update student
router.put("/:id", authorize("Admin", "Teacher"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }

    // Prevent clients from changing MongoDB internal fields
    const allowedFields = [
      "fullName", "fatherName", "email", "phone", "dateOfBirth",
      "gender", "className", "section", "subjects", "monthlyFee",
      "joiningDate", "photo", "status"
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    res.json({ success: true, student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete student (Admin only)
router.delete("/:id", authorize("Admin"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }

    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    res.json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;