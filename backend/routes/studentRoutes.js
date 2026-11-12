const express = require("express");
const Student = require("../models/Students");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const Attendance = require("../models/Attendance");
const Fees = require("../models/Fees");
const Mark = require("../models/Mark");
const { protect, authorize } = require("../middleware/auth");
const HttpError = require("../utils/httpError");
const { isId, pick, asString, parsePagination, escapeRegex } = require("../utils/helpers");

const router = express.Router();

router.use(protect);

// Only these fields can ever be set by a client (same list for create and update)
const STUDENT_FIELDS = [
  "fullName", "fatherName", "email", "phone", "dateOfBirth",
  "gender", "class", "subjects", "monthlyFee", "joiningDate", "photo", "status"
];

const STATUSES = ["Active", "Inactive"];

// Frontend ko class.name aur subjects[].name chahiye
const POPULATE = [
  { path: "class", select: "name section" },
  { path: "subjects", select: "name" }
];

function requireValidId(id) {
  if (!isId(id)) throw new HttpError(400, "Invalid student ID");
}

// class aur subjects wirklich maujood hone chahiye
async function checkRefs(data) {
  if (data.class !== undefined) {
    if (!isId(data.class) || !(await Class.exists({ _id: data.class }))) {
      throw new HttpError(400, "Selected class maujood nahi hai");
    }
  }
  if (data.subjects !== undefined) {
    if (!Array.isArray(data.subjects) || !data.subjects.every(isId)) {
      throw new HttpError(400, "subjects valid IDs ki list honi chahiye");
    }
    const unique = [...new Set(data.subjects.map(String))];
    data.subjects = unique;
    if ((await Subject.countDocuments({ _id: { $in: unique } })) !== unique.length) {
      throw new HttpError(400, "Kuch subjects maujood nahi hain");
    }
  }
}

// Add student
router.post("/", async (req, res) => {
  const data = pick(req.body, STUDENT_FIELDS);
  await checkRefs(data);
  const created = await Student.create(data);
  const student = await Student.findById(created._id).populate(POPULATE);
  res.status(201).json({ success: true, student });
});

// Get all students, with optional search, filters and pagination
router.get("/", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 100 });
  const filter = {};

  const search = asString(req.query.search);
  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { fullName: { $regex: safeSearch, $options: "i" } },
      { fatherName: { $regex: safeSearch, $options: "i" } },
      { phone: { $regex: safeSearch, $options: "i" } }
    ];
  }

  const status = asString(req.query.status);
  if (status) {
    if (!STATUSES.includes(status)) {
      throw new HttpError(400, `Status must be one of: ${STATUSES.join(", ")}`);
    }
    filter.status = status;
  }

  const classId = asString(req.query.class);
  if (classId) {
    if (!isId(classId)) throw new HttpError(400, "Invalid class ID");
    filter.class = classId;
  }

  const [students, total] = await Promise.all([
    Student.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Student.countDocuments(filter)
  ]);

  res.json({
    success: true,
    students,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  });
});

// Student Profile screen: student + attendance + fees + marks ek hi call mein
router.get("/:id/profile", async (req, res) => {
  requireValidId(req.params.id);

  const student = await Student.findById(req.params.id).populate(POPULATE);
  if (!student) throw new HttpError(404, "Student not found");

  const [attendanceCounts, fees, marks] = await Promise.all([
    Attendance.aggregate([
      { $match: { student: student._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    Fees.find({ student: student._id }).sort({ year: -1, month: -1 }),
    Mark.find({ student: student._id }).populate("subject", "name").sort({ date: -1 }).limit(20)
  ]);

  const counts = { Present: 0, Absent: 0, Late: 0, Leave: 0 };
  for (const row of attendanceCounts) counts[row._id] = row.count;
  const totalDays = Object.values(counts).reduce((a, b) => a + b, 0);
  // Present aur Late dono ko hazri maana gaya hai
  const percent = totalDays ? Math.round(((counts.Present + counts.Late) / totalDays) * 100) : 0;

  const totalAmount = fees.reduce((a, f) => a + f.amount, 0);
  const paidAmount = fees.reduce((a, f) => a + f.paidAmount, 0);

  const avgMarks = marks.length
    ? Math.round((marks.reduce((a, m) => a + m.percentage, 0) / marks.length) * 10) / 10
    : 0;

  res.json({
    success: true,
    student,
    attendance: { ...counts, totalDays, percent },
    fees: { totalAmount, paidAmount, remainingAmount: totalAmount - paidAmount, records: fees },
    marks: { averagePercent: avgMarks, recent: marks }
  });
});

// Get one student
router.get("/:id", async (req, res) => {
  requireValidId(req.params.id);

  const student = await Student.findById(req.params.id).populate(POPULATE);
  if (!student) throw new HttpError(404, "Student not found");

  res.json({ success: true, student });
});

// Update student
router.put("/:id", async (req, res) => {
  requireValidId(req.params.id);

  const updates = pick(req.body, STUDENT_FIELDS);
  await checkRefs(updates);

  const student = await Student.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate(POPULATE);

  if (!student) throw new HttpError(404, "Student not found");

  res.json({ success: true, student });
});

// Delete student (Admin only).
// Default: deactivate, so attendance, fee and marks history is kept.
// ?permanent=true: delete the student AND all their attendance, fee and marks records.
router.delete("/:id", authorize("Admin"), async (req, res) => {
  requireValidId(req.params.id);

  const existing = await Student.findById(req.params.id).select("_id");
  if (!existing) throw new HttpError(404, "Student not found");

  if (req.query.permanent === "true") {
    const [attendance, fees, marks] = await Promise.all([
      Attendance.deleteMany({ student: existing._id }),
      Fees.deleteMany({ student: existing._id }),
      Mark.deleteMany({ student: existing._id })
    ]);
    await Student.deleteOne({ _id: existing._id });

    return res.json({
      success: true,
      message: "Student and all related records permanently deleted",
      deleted: { attendance: attendance.deletedCount, fees: fees.deletedCount, marks: marks.deletedCount }
    });
  }

  const student = await Student.findByIdAndUpdate(
    existing._id,
    { $set: { status: "Inactive" } },
    { new: true }
  ).populate(POPULATE);

  res.json({
    success: true,
    message: "Student deactivated. Add ?permanent=true to delete permanently with all records.",
    student
  });
});

module.exports = router;
