const express = require("express");
const Attendance = require("../models/Attendance");
const Student = require("../models/Students");
const { protect } = require("../middleware/auth");
const HttpError = require("../utils/httpError");
const { parseDateOnly } = require("../utils/dates");
const { isId, asString, parsePagination } = require("../utils/helpers");

const router = express.Router();

router.use(protect);

const STATUSES = ["Present", "Absent", "Late", "Leave"];
const DATE_HELP = "Provide a valid date (YYYY-MM-DD), not in the future";

// Mark attendance
router.post("/", async (req, res) => {
  const { student, date, status, remarks } = req.body || {};

  if (!isId(student)) throw new HttpError(400, "Valid student ID is required");

  const normalizedDate = parseDateOnly(date);
  if (!normalizedDate) throw new HttpError(400, DATE_HELP);

  const studentDoc = await Student.findById(student).select("status");
  if (!studentDoc) throw new HttpError(404, "Student not found");
  if (studentDoc.status !== "Active") {
    throw new HttpError(400, "Cannot mark attendance for an inactive student");
  }

  try {
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
      throw new HttpError(409, "Attendance already exists for this student on this date");
    }
    throw error;
  }
});

// Get attendance. Filters: student, date, from/to (date range), status. Paginated.
router.get("/", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const filter = {};

  const student = asString(req.query.student);
  if (student) {
    if (!isId(student)) throw new HttpError(400, "Invalid student ID");
    filter.student = student;
  }

  const status = asString(req.query.status);
  if (status) {
    if (!STATUSES.includes(status)) {
      throw new HttpError(400, `Status must be one of: ${STATUSES.join(", ")}`);
    }
    filter.status = status;
  }

  if (req.query.date !== undefined) {
    const date = parseDateOnly(req.query.date);
    if (!date) throw new HttpError(400, DATE_HELP);

    const nextDay = new Date(date);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    filter.date = { $gte: date, $lt: nextDay };
  } else if (req.query.from !== undefined || req.query.to !== undefined) {
    const range = {};

    if (req.query.from !== undefined) {
      const from = parseDateOnly(req.query.from, { allowFuture: true });
      if (!from) throw new HttpError(400, "Invalid 'from' date. Use YYYY-MM-DD");
      range.$gte = from;
    }

    if (req.query.to !== undefined) {
      const to = parseDateOnly(req.query.to, { allowFuture: true });
      if (!to) throw new HttpError(400, "Invalid 'to' date. Use YYYY-MM-DD");
      range.$lte = to;
    }

    filter.date = range;
  }

  const [attendance, total] = await Promise.all([
    Attendance.find(filter)
      .populate({ path: "student", select: "fullName class", populate: { path: "class", select: "name section" } })
      .populate("markedBy", "name")
      .sort({ date: -1, _id: -1 })
      .skip(skip)
      .limit(limit),
    Attendance.countDocuments(filter)
  ]);

  res.json({
    success: true,
    count: attendance.length,
    attendance,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  });
});

// Correct an existing attendance record
router.patch("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw new HttpError(400, "Invalid attendance ID");

  const updates = {};
  if (req.body && req.body.status !== undefined) updates.status = req.body.status;
  if (req.body && req.body.remarks !== undefined) updates.remarks = req.body.remarks;

  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, "No valid fields provided");
  }

  const attendance = await Attendance.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!attendance) throw new HttpError(404, "Attendance not found");

  res.json({ success: true, attendance });
});

// Attendance grid: ek class ke Active students + us date ka status (null = abhi mark nahi hua)
// GET /api/attendance/sheet?class=<classId>&date=YYYY-MM-DD
router.get("/sheet", async (req, res) => {
  const classId = asString(req.query.class);
  if (!isId(classId)) throw new HttpError(400, "Valid class ID is required");

  const date = parseDateOnly(req.query.date);
  if (!date) throw new HttpError(400, DATE_HELP);

  const students = await Student.find({ class: classId, status: "Active" })
    .select("fullName photo")
    .sort({ fullName: 1 });

  const records = await Attendance.find({
    date,
    student: { $in: students.map((s) => s._id) }
  }).select("student status remarks");
  const byStudent = new Map(records.map((r) => [String(r.student), r]));

  res.json({
    success: true,
    date: req.query.date,
    sheet: students.map((s) => {
      const r = byStudent.get(String(s._id));
      return { student: s, status: r ? r.status : null, remarks: r ? r.remarks : "" };
    })
  });
});

// Poori class ki attendance ek saath save (dobara bhejne par update ho jati hai)
// POST /api/attendance/bulk  { date, records: [{ student, status, remarks? }] }
router.post("/bulk", async (req, res) => {
  const { date, records } = req.body || {};

  const normalizedDate = parseDateOnly(date);
  if (!normalizedDate) throw new HttpError(400, DATE_HELP);

  if (!Array.isArray(records) || records.length === 0 || records.length > 500) {
    throw new HttpError(400, "records mein 1 se 500 entries honi chahiye");
  }
  for (const r of records) {
    if (!r || !isId(r.student)) throw new HttpError(400, "Har record mein valid student ID zaroori hai");
    if (!STATUSES.includes(r.status)) {
      throw new HttpError(400, `Status must be one of: ${STATUSES.join(", ")}`);
    }
  }

  const ids = [...new Set(records.map((r) => String(r.student)))];
  const active = await Student.countDocuments({ _id: { $in: ids }, status: "Active" });
  if (active !== ids.length) {
    throw new HttpError(400, "Kuch students maujood nahi hain ya inactive hain");
  }

  await Attendance.bulkWrite(
    records.map((r) => ({
      updateOne: {
        filter: { student: r.student, date: normalizedDate },
        update: {
          $set: {
            status: r.status,
            remarks: typeof r.remarks === "string" ? r.remarks.trim().slice(0, 500) : "",
            markedBy: req.user._id
          }
        },
        upsert: true
      }
    }))
  );

  res.json({ success: true, message: `Attendance saved for ${records.length} students` });
});

module.exports = router;
