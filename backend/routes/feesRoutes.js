const express = require("express");
const mongoose = require("mongoose");
const Fees = require("../models/Fees");
const Student = require("../models/Students");
const { protect, authorize } = require("../middleware/auth");
const HttpError = require("../utils/httpError");
const { isId, asString, parsePagination } = require("../utils/helpers");

const router = express.Router();

router.use(protect);

// Who may create fee records and record payments.
// Change to ["Admin"] if only admins should handle money.
const FEE_WRITE_ROLES = ["Admin", "Teacher"];

const STATUSES = ["Pending", "Partial", "Paid"];

function parseIntInRange(value, name, min, max) {
  const text = asString(value);
  if (!/^\d+$/.test(text || "")) {
    throw new HttpError(400, `${name} must be a whole number between ${min} and ${max}`);
  }
  const number = Number(text);
  if (number < min || number > max) {
    throw new HttpError(400, `${name} must be a whole number between ${min} and ${max}`);
  }
  return number;
}

// Create monthly fee record
router.post("/", authorize(...FEE_WRITE_ROLES), async (req, res) => {
  const { student, month, year, amount, dueDate, remarks } = req.body || {};

  if (!isId(student)) throw new HttpError(400, "Valid student ID is required");

  const studentDoc = await Student.findById(student).select("status monthlyFee");
  if (!studentDoc) throw new HttpError(404, "Student not found");
  if (studentDoc.status !== "Active") {
    throw new HttpError(400, "Cannot create a fee record for an inactive student");
  }

  try {
    const fee = await Fees.create({
      student,
      month,
      year,
      // Defaults to the student's monthly fee when no amount is given
      amount: amount !== undefined ? amount : studentDoc.monthlyFee,
      dueDate,
      remarks,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, fee });
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(409, "A fee record already exists for this student and month");
    }
    throw error;
  }
});

// Get fee records. Filters: student, month, year, status. Paginated.
// The summary covers ALL records matching the filter, not just the current page.
router.get("/", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const filter = {};

  const student = asString(req.query.student);
  if (student) {
    if (!isId(student)) throw new HttpError(400, "Invalid student ID");
    filter.student = new mongoose.Types.ObjectId(student);
  }

  if (req.query.month !== undefined) filter.month = parseIntInRange(req.query.month, "month", 1, 12);
  if (req.query.year !== undefined) filter.year = parseIntInRange(req.query.year, "year", 2000, 2100);

  const status = asString(req.query.status);
  if (status) {
    if (!STATUSES.includes(status)) {
      throw new HttpError(400, `Status must be one of: ${STATUSES.join(", ")}`);
    }
    filter.status = status;
  }

  const [fees, total, totals] = await Promise.all([
    Fees.find(filter)
      .populate({ path: "student", select: "fullName phone class", populate: { path: "class", select: "name section" } })
      .populate("receivedBy", "name")
      .sort({ year: -1, month: -1, _id: -1 })
      .skip(skip)
      .limit(limit),
    Fees.countDocuments(filter),
    Fees.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          paidAmount: { $sum: "$paidAmount" }
        }
      }
    ])
  ]);

  const totalAmount = totals[0] ? totals[0].totalAmount : 0;
  const paidAmount = totals[0] ? totals[0].paidAmount : 0;

  res.json({
    success: true,
    count: fees.length,
    summary: { totalAmount, paidAmount, remainingAmount: totalAmount - paidAmount },
    fees,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  });
});

// Receive a payment. The amount is ADDED to what was already paid.
// Done as one atomic database update, so two simultaneous payments can never
// overwrite each other or push the total past the fee amount.
router.patch("/:id/payment", authorize(...FEE_WRITE_ROLES), async (req, res) => {
  if (!isId(req.params.id)) throw new HttpError(400, "Invalid fee ID");

  const payment = req.body && req.body.payment;

  if (typeof payment !== "number" || !Number.isInteger(payment) || payment <= 0) {
    throw new HttpError(400, "Payment must be a positive whole number");
  }

  let method = "Cash";
  if (req.body.paymentMethod !== undefined) {
    if (!Fees.PAYMENT_METHODS.includes(req.body.paymentMethod)) {
      throw new HttpError(400, `Payment method must be one of: ${Fees.PAYMENT_METHODS.join(", ")}`);
    }
    method = req.body.paymentMethod;
  }

  const now = new Date();

  const fee = await Fees.findOneAndUpdate(
    {
      _id: req.params.id,
      // Only match if this payment will not exceed the fee amount
      $expr: { $lte: [{ $add: ["$paidAmount", payment] }, "$amount"] }
    },
    [
      {
        $set: {
          paidAmount: { $add: ["$paidAmount", payment] },
          payments: {
            $concatArrays: [
              { $ifNull: ["$payments", []] },
              [
                {
                  _id: new mongoose.Types.ObjectId(),
                  amount: payment,
                  date: now,
                  method: { $literal: method },
                  receivedBy: req.user._id
                }
              ]
            ]
          },
          paymentDate: now,
          paymentMethod: { $literal: method },
          receivedBy: req.user._id
        }
      },
      {
        $set: {
          status: {
            $switch: {
              branches: [
                { case: { $gte: ["$paidAmount", "$amount"] }, then: "Paid" },
                { case: { $gt: ["$paidAmount", 0] }, then: "Partial" }
              ],
              default: "Pending"
            }
          }
        }
      }
    ],
    { new: true }
  );

  if (!fee) {
    // No match: either the record doesn't exist or the payment is too large
    const existing = await Fees.findById(req.params.id).select("amount paidAmount");
    if (!existing) throw new HttpError(404, "Fee record not found");

    throw new HttpError(400, "Payment exceeds the remaining balance", {
      remainingAmount: existing.amount - existing.paidAmount
    });
  }

  res.json({
    success: true,
    message: "Payment recorded successfully",
    fee,
    remainingAmount: fee.amount - fee.paidAmount
  });
});

// Mahine ke fee records poori class (ya sab Active students) ke liye ek saath banao.
// Jin ka record pehle se hai unhe chor deta hai.
// POST /api/fees/generate  { month, year, dueDate, class? }
router.post("/generate", authorize(...FEE_WRITE_ROLES), async (req, res) => {
  const { month, year, dueDate } = req.body || {};
  const classId = req.body && req.body.class;

  if (!Number.isInteger(month) || month < 1 || month > 12) throw new HttpError(400, "month 1 se 12 ke beech hona chahiye");
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new HttpError(400, "year 2000 se 2100 ke beech hona chahiye");

  const due = new Date(dueDate);
  if (typeof dueDate !== "string" || Number.isNaN(due.getTime())) throw new HttpError(400, "Valid dueDate zaroori hai");

  const filter = { status: "Active" };
  if (classId !== undefined) {
    if (!isId(classId)) throw new HttpError(400, "Invalid class ID");
    filter.class = classId;
  }

  const students = await Student.find(filter).select("monthlyFee");
  const existing = await Fees.find({ month, year, student: { $in: students.map((s) => s._id) } }).select("student");
  const have = new Set(existing.map((f) => String(f.student)));

  const docs = students
    .filter((s) => !have.has(String(s._id)))
    .map((s) => ({ student: s._id, month, year, amount: s.monthlyFee, dueDate: due, createdBy: req.user._id }));

  if (docs.length) await Fees.insertMany(docs);

  res.status(201).json({
    success: true,
    message: `${docs.length} fee records bane, ${students.length - docs.length} pehle se maujood the`,
    created: docs.length,
    skipped: students.length - docs.length
  });
});

// Delete fee record (Admin only). Records with payments need ?force=true.
router.delete("/:id", authorize("Admin"), async (req, res) => {
  if (!isId(req.params.id)) throw new HttpError(400, "Invalid fee ID");

  const fee = await Fees.findById(req.params.id);
  if (!fee) throw new HttpError(404, "Fee record not found");

  if (fee.paidAmount > 0 && req.query.force !== "true") {
    throw new HttpError(
      409,
      "This fee record has payments. Add ?force=true to delete it anyway."
    );
  }

  await fee.deleteOne();

  res.json({ success: true, message: "Fee record deleted successfully" });
});

module.exports = router;
