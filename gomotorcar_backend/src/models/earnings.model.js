const mongoose = require("mongoose");

const earningsSchema = new mongoose.Schema(
  {
    // ─── Cleaner ─────────────────────────────────────────
    cleanerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // ─── Work Session Reference ──────────────────────────
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "WorkSession",
    },

    // ─── Earning Type ────────────────────────────────────
    earningType: {
      type:    String,
      enum:    ["external_cleaning", "internal_cleaning", "tip"],
      required: true,
    },

    // ─── Amount ──────────────────────────────────────────
    amount: {
      type:     Number,
      required: true,
    },

    // ─── Customer (for tips) ─────────────────────────────
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },

    // ─── Period ──────────────────────────────────────────
    // For quick aggregation
    date: {
      type:     Date,
      required: true,
    },

    week: {
      type: Number,
      // Week number of year
    },

    month: {
      type: Number,
    },

    year: {
      type: Number,
    },

    // ─── Payment Status ──────────────────────────────────
    isPaid: {
      type:    Boolean,
      default: false,
    },

    paidAt: {
      type: Date,
    },

    isDeleted: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────
earningsSchema.index({ cleanerId: 1 });
earningsSchema.index({ date: 1 });
earningsSchema.index({ month: 1, year: 1 });
earningsSchema.index({ isPaid: 1 });

const Earnings = mongoose.model("Earnings", earningsSchema);

module.exports = Earnings;