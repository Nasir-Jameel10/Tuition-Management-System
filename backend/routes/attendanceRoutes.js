const express = require("express");
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Student = require("../models/Students");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

function normalizeDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  if (date > new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z")) {
    return null;
  }

  return date;
}

// Mark attendance
router.post("/", authorize("Admin", "Teacher"), async (req, res) => {
  try {
    const { student, date, status, remarks } = req.body;
    const normalizedDate = normalizeDate(date);

    if (!mongoose.isValidObjectId(student)) {
      return res.status(400).json({ success: false, message: "Valid student ID is required" });
    }

    if (!normalizedDate) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid date (YYYY-MM-DD), not in the future"
      });
    }

    const studentExists = await Student.exists({ _id: student });

    if (!studentExists) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const attendance = await Attendance.create({
      student,
      date: normalizedDate,
      status,
      remarks,
      markedBy: req.user._id
    });

    res.status(201).json({ success: true, attendance });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Attendance already exists for this student on this date"
      });
    }

    res.status(400).json({ success: false, message: error.message });
  }
});

// Get attendance, optionally filter by date or student
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.student) {
      if (!mongoose.isValidObjectId(req.query.student)) {
        return res.status(400).json({ success: false, message: "Invalid student ID" });
      }
      filter.student = req.query.student;
    }

    if (req.query.date) {
      const date = normalizeDate(req.query.date);
      if (!date) {
        return res.status(400).json({ success: false, message: "Invalid date" });
      }

      const nextDay = new Date(date);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      filter.date = { $gte: date, $lt: nextDay };
    }

    const attendance = await Attendance.find(filter)
      .populate("student", "fullName className section")
      .populate("markedBy", "name")
      .sort({ date: -1 });

    res.json({ success: true, count: attendance.length, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Correct an existing attendance record
router.patch("/:id", authorize("Admin", "Teacher"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid attendance ID" });
    }

    const updates = {};

    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.remarks !== undefined) updates.remarks = req.body.remarks;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields provided" });
    }

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!attendance) {
      return res.status(404).json({ success: false, message: "Attendance not found" });
    }

    res.json({ success: true, attendance });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;