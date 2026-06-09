const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    // ─── Allocated to ────────────────────────────────────
    cleanerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // ─── Allocated by ────────────────────────────────────
    supervisorId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // ─── Item Details ────────────────────────────────────
    itemName: {
      type:     String,
      required: [true, "Item name is required"],
      trim:     true,
      // e.g. "Microfiber Cloth", "Car Shampoo"
    },

    quantity: {
      type:     Number,
      required: true,
      min:      1,
    },

    unit: {
      type:    String,
      default: "piece",
      // piece, litre, kg, bottle
    },

    // ─── Allocation Date ─────────────────────────────────
    allocatedAt: {
      type:    Date,
      default: Date.now,
    },

    // ─── Acceptance Status ───────────────────────────────
    status: {
      type:    String,
      enum:    ["pending", "accepted", "rejected", "disputed"],
      default: "pending",
    },

    acceptedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
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
inventorySchema.index({ cleanerId: 1 });
inventorySchema.index({ supervisorId: 1 });
inventorySchema.index({ status: 1 });

const Inventory = mongoose.model("Inventory", inventorySchema);

module.exports = Inventory;