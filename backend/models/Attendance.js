const mongoose = require("mongoose");
const { isNotFuture } = require("../utils/dates");

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"]
    },

    date: {
      type: Date,
      required: [true, "Attendance date is required"],
      validate: {
        validator: function (value) {
          // "Today" is evaluated in the academy's timezone (APP_TIMEZONE)
          return isNotFuture(value);
        },
        message: "Attendance date cannot be in the future"
      }
    },

    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "Leave"],
      required: [true, "Attendance status is required"],
      default: "Present"
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

// One attendance record per student per calendar day
attendanceSchema.index(
  { student: 1, date: 1 },
  { unique: true }
);

attendanceSchema.index({ date: 1, status: 1 });

module.exports =
  mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);