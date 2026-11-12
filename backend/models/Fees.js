const mongoose = require("mongoose");

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "JazzCash", "EasyPaisa", "Other"];

// Fees are stored in whole rupees to avoid floating-point rounding errors.
const wholeNumber = {
  validator: Number.isInteger,
  message: "{PATH} must be a whole number"
};

// Every payment is kept, so partial payments leave a full audit trail.
const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 1, validate: wholeNumber },
  date: { type: Date, default: Date.now },
  method: { type: String, enum: PAYMENT_METHODS, default: "Cash" },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
});

const feesSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"]
    },

    month: {
      type: Number,
      required: [true, "Fee month is required"],
      min: 1,
      max: 12,
      validate: wholeNumber
    },

    year: {
      type: Number,
      required: [true, "Fee year is required"],
      min: 2000,
      max: 2100,
      validate: wholeNumber
    },

    amount: {
      type: Number,
      required: [true, "Fee amount is required"],
      min: [0, "Fee amount cannot be negative"],
      validate: wholeNumber
    },

    // Running total of all payments (kept in sync atomically by the payment route)
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, "Paid amount cannot be negative"],
      validate: wholeNumber
    },

    status: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Pending"
    },

    dueDate: {
      type: Date,
      required: [true, "Fee due date is required"]
    },

    payments: {
      type: [paymentSchema],
      default: []
    },

    // Convenience copies of the most recent payment
    paymentDate: {
      type: Date,
      default: null
    },

    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "Cash"
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },

    // Who created the fee record
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // Who received the most recent payment
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

// One fee record per student per month and year
feesSchema.index({ student: 1, month: 1, year: 1 }, { unique: true });
feesSchema.index({ status: 1, year: 1, month: 1 });

feesSchema.virtual("remainingAmount").get(function () {
  return this.amount - this.paidAmount;
});

// Document-level validation (runs on create/save, where `this` is the document)
feesSchema.pre("validate", function () {
  if (this.paidAmount > this.amount) {
    this.invalidate("paidAmount", "Paid amount cannot exceed the total fee");
  }

  if (this.paidAmount === 0) {
    this.status = "Pending";
  } else if (this.paidAmount < this.amount) {
    this.status = "Partial";
  } else {
    this.status = "Paid";
  }
});

feesSchema.set("toJSON", { virtuals: true });
feesSchema.set("toObject", { virtuals: true });

module.exports =
  mongoose.models.Fees ||
  mongoose.model("Fees", feesSchema);
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
