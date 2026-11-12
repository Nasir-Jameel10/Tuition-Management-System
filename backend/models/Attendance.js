const mongoose = require("mongoose");

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
          const today = new Date();

          // Compare calendar dates in UTC
          const inputDate = new Date(
            Date.UTC(
              value.getUTCFullYear(),
              value.getUTCMonth(),
              value.getUTCDate()
            )
          );

          const todayDate = new Date(
            Date.UTC(
              today.getUTCFullYear(),
              today.getUTCMonth(),
              today.getUTCDate()
            )
          );

          return inputDate <= todayDate;
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