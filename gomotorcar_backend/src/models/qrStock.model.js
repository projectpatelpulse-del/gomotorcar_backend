const mongoose = require("mongoose");

const qrStockSchema = new mongoose.Schema(
  {
    // ─── Supervisor ──────────────────────────────────────
    supervisorId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      // required: true,
    },

    // ─── QR Code Details ─────────────────────────────────
    qrCode: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
    },

    qrIdentificationNo: {
      type:  String,
      trim:  true,
      // Human readable number printed on sticker
      // e.g. "55-001"
    },

    // ─── Status ──────────────────────────────────────────
    status: {
      type:    String,
      enum:    ["available", "allocated", "damaged", "lost"],
      default: "available",
    },

    // ─── Allocation ──────────────────────────────────────
    allocatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
      // Customer user ID
    },

    allocatedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Vehicle",
    },

    allocatedAt: {
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
qrStockSchema.index({ supervisorId: 1 });
qrStockSchema.index({ status: 1 });

const QRStock = mongoose.model("QRStock", qrStockSchema);

module.exports = QRStock;