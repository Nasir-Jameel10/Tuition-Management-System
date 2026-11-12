const express = require("express");
const Fees = require("../models/Fees");
const Attendance = require("../models/Attendance");
const Mark = require("../models/Mark");
const { protect } = require("../middleware/auth");
const HttpError = require("../utils/httpError");
const { asString } = require("../utils/helpers");
const { todayString, parseDateOnly } = require("../utils/dates");

const router = express.Router();
router.use(protect);

// Reports screen: ?year=2026&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/overview", async (req, res) => {
  const yearText = asString(req.query.year);
  if (yearText !== undefined && !/^\d{4}$/.test(yearText)) throw new HttpError(400, "year 4 digits ka hona chahiye");
  const year = yearText ? Number(yearText) : Number(todayString().slice(0, 4));

  const dateRange = {};
  if (req.query.from !== undefined) {
    const from = parseDateOnly(req.query.from, { allowFuture: true });
    if (!from) throw new HttpError(400, "Invalid 'from' date. Use YYYY-MM-DD");
    dateRange.$gte = from;
  }
  if (req.query.to !== undefined) {
    const to = parseDateOnly(req.query.to, { allowFuture: true });
    if (!to) throw new HttpError(400, "Invalid 'to' date. Use YYYY-MM-DD");
    dateRange.$lte = to;
  }
  const attendanceMatch = Object.keys(dateRange).length ? { date: dateRange } : {};

  const [feesByMonth, attendanceRows, marksBySubject] = await Promise.all([
    Fees.aggregate([
      { $match: { year } },
      { $group: { _id: "$month", totalAmount: { $sum: "$amount" }, paidAmount: { $sum: "$paidAmount" } } },
      { $sort: { _id: 1 } }
    ]),
    Attendance.aggregate([{ $match: attendanceMatch }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Mark.aggregate([
      {
        $group: {
          _id: "$subject",
          tests: { $sum: 1 },
          averagePercent: { $avg: { $multiply: [{ $divide: ["$obtainedMarks", "$totalMarks"] }, 100] } }
        }
      },
      { $lookup: { from: "subjects", localField: "_id", foreignField: "_id", as: "subject" } },
      { $unwind: { path: "$subject", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          subjectId: "$_id",
          subject: "$subject.name",
          tests: 1,
          averagePercent: { $round: ["$averagePercent", 1] }
        }
      },
      { $sort: { subject: 1 } }
    ])
  ]);

  const attendance = { Present: 0, Absent: 0, Late: 0, Leave: 0 };
  for (const row of attendanceRows) attendance[row._id] = row.count;
  const total = Object.values(attendance).reduce((a, b) => a + b, 0);

  res.json({
    success: true,
    year,
    feesByMonth: feesByMonth.map((r) => ({
      month: r._id,
      totalAmount: r.totalAmount,
      paidAmount: r.paidAmount,
      pendingAmount: r.totalAmount - r.paidAmount
    })),
    attendance: {
      ...attendance,
      total,
      percent: total ? Math.round(((attendance.Present + attendance.Late) / total) * 100) : 0
    },
    marksBySubject
  });
});

module.exports = router;