const mongoose = require("mongoose");

const fasttagRechargeSchema = new mongoose.Schema(
  {
    // ─── Customer ────────────────────────────────────────
    customerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // ─── Vehicle ─────────────────────────────────────────
    vehicleNo: {
      type:      String,
      required:  [true, "Vehicle number is required"],
      trim:      true,
      uppercase: true,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Vehicle",
      // Optional — if vehicle registered in app
    },

    // ─── Recharge Details ────────────────────────────────
    amount: {
      type:     Number,
      required: [true, "Amount is required"],
      min:      [100,   "Minimum recharge amount is ₹100"],
      max:      [10000, "Maximum recharge amount is ₹10,000"],
    },

    // ─── Balance (from third party API) ──────────────────
    preRechargeBalance: {
      type:    Number,
      default: null,
      // Balance before recharge
    },

    postRechargeBalance: {
      type:    Number,
      default: null,
      // Balance after recharge
    },

    // ─── Status ──────────────────────────────────────────
    status: {
      type:    String,
      enum:    ["pending", "success", "failed"],
      default: "pending",
    },

    // ─── Payment Reference ───────────────────────────────
    paymentId: {
      type: String,
      // Razorpay payment ID
    },

    // ─── Third Party Reference ───────────────────────────
    thirdPartyRef: {
      type: String,
      // FastTag API reference number
    },

    errorMessage: {
      type: String,
      // If recharge failed
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
fasttagRechargeSchema.index({ customerId: 1 });
fasttagRechargeSchema.index({ vehicleNo: 1 });
fasttagRechargeSchema.index({ status: 1 });
fasttagRechargeSchema.index({ createdAt: -1 });

const FasttagRecharge = mongoose.model(
  "FasttagRecharge",
  fasttagRechargeSchema
);

module.exports = FasttagRecharge;