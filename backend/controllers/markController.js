const Mark = require("../models/Mark");
const Student = require("../models/Students");
const Subject = require("../models/Subject");
const HttpError = require("../utils/httpError");
const { isId, pick, asString, parsePagination } = require("../utils/helpers");

const FIELDS = ["student", "subject", "testName", "totalMarks", "obtainedMarks", "date"];
const POPULATE = [
  { path: "student", select: "fullName class" },
  { path: "subject", select: "name" }
];

async function requireRefs({ student, subject }) {
  if (!isId(student) || !(await Student.exists({ _id: student }))) throw new HttpError(400, "Valid student zaroori hai");
  if (!isId(subject) || !(await Subject.exists({ _id: subject }))) throw new HttpError(400, "Valid subject zaroori hai");
}

// GET /api/marks?student=&subject=&class=&testName=&page=&limit=
exports.list = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const filter = {};

  for (const key of ["student", "subject"]) {
    const value = asString(req.query[key]);
    if (value) {
      if (!isId(value)) throw new HttpError(400, `Invalid ${key} ID`);
      filter[key] = value;
    }
  }
  const classId = asString(req.query.class);
  if (classId) {
    if (!isId(classId)) throw new HttpError(400, "Invalid class ID");
    filter.student = { $in: await Student.distinct("_id", { class: classId }) };
  }
  const testName = asString(req.query.testName);
  if (testName) filter.testName = testName;

  const [marks, total] = await Promise.all([
    Mark.find(filter).populate(POPULATE).sort({ date: -1, _id: -1 }).skip(skip).limit(limit),
    Mark.countDocuments(filter)
  ]);

  res.json({ success: true, marks, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
};

exports.byStudent = async (req, res) => {
  if (!isId(req.params.id)) throw new HttpError(400, "Invalid student ID");
  const marks = await Mark.find({ student: req.params.id }).populate("subject", "name").sort({ date: -1 });
  res.json({ success: true, marks });
};

exports.create = async (req, res) => {
  const data = pick(req.body, FIELDS);
  await requireRefs(data);
  try {
    const mark = await Mark.create(data);
    res.status(201).json({ success: true, mark });
  } catch (err) {
    if (err.code === 11000) throw new HttpError(409, "Is student ka yeh test is subject mein pehle se darj hai");
    throw err;
  }
};

// POST /api/marks/bulk  { subject, testName, totalMarks, date?, results: [{ student, obtainedMarks }] }
// "Tests & Marks" screen: poori class ke marks ek saath save.
exports.bulkCreate = async (req, res) => {
  const { subject, testName, totalMarks, date, results } = req.body || {};
  if (!Array.isArray(results) || results.length === 0 || results.length > 500) {
    throw new HttpError(400, "results mein 1 se 500 entries honi chahiye");
  }
  for (const r of results) {
    if (!isId(r && r.student)) throw new HttpError(400, "Har result mein valid student zaroori hai");
  }
  if (!isId(subject) || !(await Subject.exists({ _id: subject }))) throw new HttpError(400, "Valid subject zaroori hai");

  const ids = [...new Set(results.map((r) => String(r.student)))];
  if ((await Student.countDocuments({ _id: { $in: ids } })) !== ids.length) {
    throw new HttpError(400, "Kuch students maujood nahi hain");
  }

  try {
    const marks = await Mark.insertMany(
      results.map((r) => ({ student: r.student, subject, testName, totalMarks, obtainedMarks: r.obtainedMarks, date }))
    );
    res.status(201).json({ success: true, count: marks.length, marks });
  } catch (err) {
    if (err.code === 11000) throw new HttpError(409, "Is test ke marks kuch students ke liye pehle se darj hain");
    throw err;
  }
};

exports.update = async (req, res) => {
  if (!isId(req.params.id)) throw new HttpError(400, "Invalid mark ID");
  const mark = await Mark.findById(req.params.id);
  if (!mark) throw new HttpError(404, "Result nahi mila");

  // student aur subject badalna allowed nahi, sirf marks/test details
  mark.set(pick(req.body, ["testName", "totalMarks", "obtainedMarks", "date"]));
  await mark.save();
  res.json({ success: true, mark });
};

exports.remove = async (req, res) => {
  if (!isId(req.params.id)) throw new HttpError(400, "Invalid mark ID");
  const mark = await Mark.findByIdAndDelete(req.params.id);
  if (!mark) throw new HttpError(404, "Result nahi mila");
  res.json({ success: true, message: "Result delete ho gaya" });
};
