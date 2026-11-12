const express = require("express");
const Student = require("../models/Students");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const Attendance = require("../models/Attendance");
const Fees = require("../models/Fees");
const { protect } = require("../middleware/auth");
const { todayString, parseDateOnly } = require("../utils/dates");

const router = express.Router();
router.use(protect);

// Dashboard ke saare numbers ek hi call mein
router.get("/", async (req, res) => {
  const today = todayString(); // "YYYY-MM-DD" (APP_TIMEZONE ke hisab se)
  const [year, month] = today.split("-").map(Number);

  const [students, activeStudents, classes, subjects, monthFees, allFees, attendance, recentStudents] =
    await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: "Active" }),
      Class.countDocuments(),
      Subject.countDocuments(),
      Fees.aggregate([
        { $match: { month, year } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" }, paidAmount: { $sum: "$paidAmount" } } }
      ]),
      Fees.aggregate([{ $group: { _id: null, paidAmount: { $sum: "$paidAmount" } } }]),
      Attendance.aggregate([
        { $match: { date: parseDateOnly(today) } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Student.find().sort({ createdAt: -1 }).limit(5).populate("class", "name section").select("fullName class status")
    ]);

  const totalAmount = monthFees[0] ? monthFees[0].totalAmount : 0;
  const paidAmount = monthFees[0] ? monthFees[0].paidAmount : 0;

  const attendanceToday = { Present: 0, Absent: 0, Late: 0, Leave: 0 };
  for (const row of attendance) attendanceToday[row._id] = row.count;

  res.json({
    success: true,
    counts: { students, activeStudents, classes, subjects },
    fees: {
      month,
      year,
      totalAmount,
      paidAmount,
      pendingAmount: totalAmount - paidAmount,
      percent: totalAmount ? Math.round((paidAmount / totalAmount) * 100) : 0,
      allTimePaid: allFees[0] ? allFees[0].paidAmount : 0
    },
    attendanceToday,
    recentStudents
  });
});

module.exports = router;