const mongoose = require("mongoose");

// Wallet ledger entry schema
const ledgerEntrySchema = new mongoose.Schema({
  type: {
    type:    String,
    enum:    ["credit", "debit"],
    required: true,
  },

  amount: {
    type:     Number,
    required: true,
  },

  purpose: {
    type: String,
    enum: [
      "topup",           // Added money
      "booking_payment", // Paid for booking
      "booking_refund",  // Refund received
      "cashback",        // Cashback earned
      "subscription",    // Subscription payment
    ],
    required: true,
  },

  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
  },

  description: {
    type: String,
  },

  balanceAfter: {
    type: Number,
    // Balance after this transaction
  },

  createdAt: {
    type:    Date,
    default: Date.now,
  },
}, { _id: true });

const walletSchema = new mongoose.Schema(
  {
    // ─── Owner ───────────────────────────────────────────
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      unique:   true,
    },

    // ─── Balance ─────────────────────────────────────────
    balance: {
      type:    Number,
      default: 0,
      min:     [0, "Wallet balance cannot be negative"],
    },

    // ─── Ledger ──────────────────────────────────────────
    ledger: [ledgerEntrySchema],

    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;