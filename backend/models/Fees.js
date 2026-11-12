const mongoose = require("mongoose");

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
      max: 12
    },

    year: {
      type: Number,
      required: [true, "Fee year is required"],
      min: 2000,
      max: 2100
    },

    amount: {
      type: Number,
      required: [true, "Fee amount is required"],
      min: [0, "Fee amount cannot be negative"]
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: [0, "Paid amount cannot be negative"],
      validate: {
        validator: function (value) {
          return value <= this.amount;
        },
        message: "Paid amount cannot exceed the total fee"
      }
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

    paymentDate: {
      type: Date,
      default: null
    },

    paymentMethod: {
      type: String,
      enum: [
        "Cash",
        "Bank Transfer",
        "JazzCash",
        "EasyPaisa",
        "Other"
      ],
      default: "Cash"
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },

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
feesSchema.index(
  { student: 1, month: 1, year: 1 },
  { unique: true }
);

feesSchema.index({ status: 1, year: 1, month: 1 });

feesSchema.virtual("remainingAmount").get(function () {
  return this.amount - this.paidAmount;
});

// Automatically calculate payment status
feesSchema.pre("validate", function () {
  if (this.paidAmount === 0) {
    this.status = "Pending";
  } else if (this.paidAmount < this.amount) {
    this.status = "Partial";
  } else if (this.paidAmount === this.amount) {
    this.status = "Paid";
  }
});

feesSchema.set("toJSON", { virtuals: true });
feesSchema.set("toObject", { virtuals: true });

module.exports =
  mongoose.models.Fees ||
  mongoose.model("Fees", feesSchema);