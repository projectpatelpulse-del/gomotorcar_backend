const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // ─── Customer ────────────────────────────────────────
    customerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // ─── Payment Purpose ─────────────────────────────────
    purpose: {
      type:    String,
      enum:    [
        "booking",
        "subscription",
        "fasttag",
        "wallet_topup",
        "ncsp_annual_fee",
      ],
      required: true,
    },

    // ─── Reference ───────────────────────────────────────
    // Reference to booking/subscription/fasttag etc
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    referenceModel: {
      type: String,
      enum: ["Booking", "Subscription", "FasttagRecharge"],
    },

    // ─── Amount ──────────────────────────────────────────
    amount: {
      type:     Number,
      required: true,
    },

    currency: {
      type:    String,
      default: "INR",
    },

    // ─── Razorpay ────────────────────────────────────────
    razorpayOrderId: {
      type: String,
      // Created when order initiated
    },

    razorpayPaymentId: {
      type: String,
      // Received after payment success
    },

    razorpaySignature: {
      type: String,
      // For payment verification
    },

    // ─── Status ──────────────────────────────────────────
    status: {
      type:    String,
      enum:    ["created", "success", "failed", "refunded"],
      default: "created",
    },

    // ─── Refund ──────────────────────────────────────────
    refundId: {
      type: String,
    },

    refundAmount: {
      type:    Number,
      default: 0,
    },

    refundReason: {
      type: String,
    },

    refundedAt: {
      type: Date,
    },

    // ─── Method ──────────────────────────────────────────
    paymentMethod: {
      type: String,
      // upi, card, netbanking, wallet
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
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ purpose: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;