const mongoose = require("mongoose");
const { OTP_PURPOSE } = require("../config/constants");

const otpSchema = new mongoose.Schema(
  {
    mobileNo: {
      type:     String,
      required: [true, "Mobile number is required"],
      trim:     true,
    },

    otpHash: {
      type:     String,
      required: true,
      // We store hash, never raw OTP
    },

    purpose: {
      type:     String,
      enum:     Object.values(OTP_PURPOSE),
      required: true,
    },

    expiresAt: {
      type:     Date,
      required: true,
    },

    attempts: {
      type:    Number,
      default: 0,
    },

    isUsed: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────
otpSchema.index({ mobileNo: 1, purpose: 1 });

// Auto delete OTP documents after they expire
// MongoDB TTL index — cleans up automatically
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model("OTP", otpSchema);

module.exports = OTP;