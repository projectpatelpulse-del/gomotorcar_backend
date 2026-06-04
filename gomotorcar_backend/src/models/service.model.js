const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    // ─── Service Info ────────────────────────────────────
    name: {
      type:     String,
      required: [true, "Service name is required"],
      trim:     true,
      // e.g. "Periodic Service", "Wheel Care"
    },

    description: {
      type:  String,
      trim:  true,
    },

    icon: {
      type: String,
    },

    // ─── Service Type ────────────────────────────────────
    // csp = Contracted Service Provider services
    // steam = Steam Car Wash
    serviceType: {
      type:    String,
      enum:    ["csp", "steam"],
      default: "csp",
    },

    // ─── Pricing per vehicle category ───────────────────
    pricing: {
      hatchback: { type: Number, default: 0 },
      sedan:     { type: Number, default: 0 },
      suv:       { type: Number, default: 0 },
      luxury:    { type: Number, default: 0 },
    },

    // ─── Service Mode ────────────────────────────────────
    // at_works = customer brings car
    // door_step = franchise comes to customer
    // both = either option
    serviceMode: {
      type:    String,
      enum:    ["at_works", "door_step", "both"],
      default: "both",
    },

    // ─── Duration ────────────────────────────────────────
    // Estimated time in minutes
    estimatedDuration: {
      type:    Number,
      default: 60,
    },

    // ─── Warranty ────────────────────────────────────────
    hasWarranty: {
      type:    Boolean,
      default: false,
    },

    warrantyDays: {
      type:    Number,
      default: 0,
    },

    // ─── Display ─────────────────────────────────────────
    sortOrder: {
      type:    Number,
      default: 0,
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
serviceSchema.index({ serviceType: 1 });
serviceSchema.index({ isActive: 1 });
serviceSchema.index({ sortOrder: 1 });

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;