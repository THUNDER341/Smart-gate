const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    host: String,
    purpose: String,

    otp: String,
    otpExpires: Date,
    isVerified: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "checked-in", "checked-out", "rejected"]
    },

    qrCode: String,
    approvedAt: Date,
    validUntil: Date,
    checkInTime: Date,
    checkOutTime: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("Visitor", visitorSchema);
