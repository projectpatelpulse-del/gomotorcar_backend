const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    // ─── Basic Info ──────────────────────────────────────
    name: {
      type:     String,
      required: [true, "Package name is required"],
      trim:     true,
      // e.g. "Monthly Elite", "Basic Monthly"
    },

    description: {
      type:  String,
      trim:  true,
    },

    // ─── Package Type ────────────────────────────────────
    // general = available to all customers
    // apartment_wise = specific to an apartment
    packageType: {
      type:    String,
      enum:    ["general", "apartment_wise"],
      default: "general",
    },

    // If apartment_wise — which apartment
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Apartment",
    },

    // ─── Duration ────────────────────────────────────────
    durationDays: {
      type:     Number,
      required: [true, "Duration is required"],
      // e.g. 30 = monthly, 90 = quarterly
    },

    // ─── Cleaning Count ──────────────────────────────────
    // How many cleanings included in package
    externalCleanings: {
      type:    Number,
      default: 0,
      // External = outside of car
    },

    internalCleanings: {
      type:    Number,
      default: 0,
      // Internal = inside of car
    },

    // ─── Pricing ─────────────────────────────────────────
    price: {
      type:     Number,
      required: [true, "Price is required"],
    },

    // Price per extra cleaning (beyond package)
    extraCleaningPrice: {
      type:    Number,
      default: 0,
    },

    // ─── Status ──────────────────────────────────────────
    isActive: {
      type:    Boolean,
      default: true,
      // Admin can deactivate a package
    },

    isDeleted: {
      type:    Boolean,
      default: false,
    },

    // ─── Created by ──────────────────────────────────────
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
packageSchema.index({ packageType: 1 });
packageSchema.index({ isActive: 1 });
packageSchema.index({ apartmentId: 1 });

const Package = mongoose.model("Package", packageSchema);

module.exports = Package;