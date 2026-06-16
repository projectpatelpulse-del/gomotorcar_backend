const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    // ─── Coupon Code ─────────────────────────────────────
    code: {
      type:      String,
      required:  [true, "Coupon code is required"],
      unique:    true,
      uppercase: true,
      trim:      true,
      // e.g. "WELCOME50", "CLEAN20"
    },

    description: {
      type:  String,
      trim:  true,
    },

    // ─── Discount ────────────────────────────────────────
    discountType: {
      type:    String,
      enum:    ["percentage", "flat"],
      required: true,
      // percentage = 20% off
      // flat = ₹100 off
    },

    discountValue: {
      type:     Number,
      required: true,
    },

    // ─── Limits ──────────────────────────────────────────
    minOrderAmount: {
      type:    Number,
      default: 0,
    },

    maxDiscountAmount: {
      type:    Number,
      // Only for percentage type
      // e.g. max ₹500 off even if 20% is more
    },

    // ─── Usage ───────────────────────────────────────────
    maxUsage: {
      type:    Number,
      default: 100,
      // Total times this coupon can be used
    },

    maxUsagePerUser: {
      type:    Number,
      default: 1,
    },

    usedCount: {
      type:    Number,
      default: 0,
    },

    // ─── Applicability ───────────────────────────────────
    applicableOn: {
      type:    String,
      enum:    ["all", "booking", "subscription", "fasttag"],
      default: "all",
    },

    // ─── Validity ────────────────────────────────────────
    validFrom: {
      type:     Date,
      required: true,
    },

    validTo: {
      type:     Date,
      required: true,
    },

    isActive: {
      type:    Boolean,
      default: true,
    },

    isDeleted: {
      type:    Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────
couponSchema.index({ isActive: 1 });
couponSchema.index({ validTo: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;