const express = require("express");
const mongoose = require("mongoose");
const Fees = require("../models/Fees");
const Student = require("../models/Students");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

const validId = (id) => mongoose.isValidObjectId(id);

// Create monthly fee record
router.post("/", authorize("Admin", "Teacher"), async (req, res) => {
  try {
    const { student, month, year, amount, dueDate, remarks } = req.body;

    if (!validId(student)) {
      return res.status(400).json({ success: false, message: "Valid student ID is required" });
    }

    const studentExists = await Student.exists({ _id: student });

    if (!studentExists) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const fee = await Fees.create({
      student,
      month,
      year,
      amount,
      dueDate,
      remarks,
      paidAmount: 0,
      status: "Pending",
      receivedBy: req.user._id
    });

    res.status(201).json({ success: true, fee });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A fee record already exists for this student and month"
      });
    }

    res.status(400).json({ success: false, message: error.message });
  }
});

// Get fee records, optionally filter by student, month, year or status
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.student) {
      if (!validId(req.query.student)) {
        return res.status(400).json({ success: false, message: "Invalid student ID" });
      }
      filter.student = req.query.student;
    }

    if (req.query.month !== undefined) filter.month = Number(req.query.month);
    if (req.query.year !== undefined) filter.year = Number(req.query.year);
    if (req.query.status) filter.status = req.query.status;

    const fees = await Fees.find(filter)
      .populate("student", "fullName className section phone")
      .populate("receivedBy", "name")
      .sort({ year: -1, month: -1 });

    const summary = fees.reduce(
      (result, fee) => {
        result.totalAmount += fee.amount;
        result.paidAmount += fee.paidAmount;
        result.remainingAmount += fee.amount - fee.paidAmount;
        return result;
      },
      { totalAmount: 0, paidAmount: 0, remainingAmount: 0 }
    );

    res.json({ success: true, count: fees.length, summary, fees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Receive a payment (amount is added to the existing paid amount)
router.patch("/:id/payment", authorize("Admin", "Teacher"), async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid fee ID" });
    }

    const payment = req.body.payment;

    if (typeof payment !== "number" || !Number.isFinite(payment) || payment <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment must be a positive number"
      });
    }

    const fee = await Fees.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({ success: false, message: "Fee record not found" });
    }

    if (fee.paidAmount + payment > fee.amount) {
      return res.status(400).json({
        success: false,
        message: "Payment exceeds the remaining balance",
        remainingAmount: fee.amount - fee.paidAmount
      });
    }

    fee.paidAmount += payment;
    fee.paymentDate = new Date();
    if (req.body.paymentMethod !== undefined) {
      fee.paymentMethod = req.body.paymentMethod;
    }
    fee.receivedBy = req.user._id;

    await fee.save();

    res.json({
      success: true,
      message: "Payment recorded successfully",
      fee,
      remainingAmount: fee.amount - fee.paidAmount
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete fee record (Admin only)
router.delete("/:id", authorize("Admin"), async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid fee ID" });
    }

    const fee = await Fees.findByIdAndDelete(req.params.id);

    if (!fee) {
      return res.status(404).json({ success: false, message: "Fee record not found" });
    }

    res.json({ success: true, message: "Fee record deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;