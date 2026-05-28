const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    // ─── Owner ───────────────────────────────────────────
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: [true, "User is required"],
    },

    // ─── Type ────────────────────────────────────────────
    // Home, Work, Others as per the app document
    type: {
      type:    String,
      enum:    ["home", "work", "other"],
      default: "home",
    },

    label: {
      type:  String,
      trim:  true,
      // Custom label e.g. "Mom's House", "Office"
    },

    // ─── Address Fields ──────────────────────────────────
    line1: {
      type:     String,
      required: [true, "Address line 1 is required"],
      trim:     true,
    },

    line2: {
      type:  String,
      trim:  true,
    },

    landmark: {
      type:  String,
      trim:  true,
    },

    city: {
      type:     String,
      required: [true, "City is required"],
      trim:     true,
    },

    state: {
      type:     String,
      required: [true, "State is required"],
      trim:     true,
    },

    pinCode: {
      type:     String,
      required: [true, "Pin code is required"],
      trim:     true,
      match:    [/^\d{6}$/, "Enter valid 6 digit pin code"],
    },

    // ─── Geo Location ────────────────────────────────────
    // For map-based service search
    location: {
      type: {
        type:    String,
        enum:    ["Point"],
        default: "Point",
      },
      coordinates: {
        type:    [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

    // ─── Flags ───────────────────────────────────────────
    isDefault: {
      type:    Boolean,
      default: false,
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
addressSchema.index({ userId: 1 });
addressSchema.index({ location: "2dsphere" }); // for geo queries

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;