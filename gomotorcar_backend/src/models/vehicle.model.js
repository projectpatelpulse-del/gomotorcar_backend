const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    // ─── Owner ───────────────────────────────────────────
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: [true, "User is required"],
    },

    // ─── Vehicle Info ────────────────────────────────────
    registrationNo: {
      type:     String,
      required: [true, "Registration number is required"],
      trim:     true,
      uppercase: true,
      // Indian vehicle format e.g. KA05MN1234
    },

    brand: {
      type:  String,
      trim:  true,
    },

    model: {
      type:  String,
      trim:  true,
    },

    variant: {
      type:  String,
      trim:  true,
    },

    year: {
      type: Number,
    },

    color: {
      type:  String,
      trim:  true,
    },

    // ─── Vehicle Category ────────────────────────────────
    // Needed for service pricing (hatchback, sedan, SUV, luxury)
    category: {
      type: String,
      enum: ["hatchback", "sedan", "suv", "luxury", "other"],
      default: "other",
    },

    fuelType: {
      type: String,
      enum: ["petrol", "diesel", "cng", "electric", "hybrid"],
    },

    // ─── QR Code ─────────────────────────────────────────
    // Allocated after first service payment
    qrCode: {
      type: String,
      unique: true,
      sparse: true,
    },

    qrCodeAllocatedAt: {
      type: Date,
    },

    // ─── Flags ───────────────────────────────────────────
    // Primary car shown on home screen
    isPrimary: {
      type:    Boolean,
      default: false,
    },

    // RC verified via third party API
    isRcVerified: {
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
vehicleSchema.index({ userId: 1 });
vehicleSchema.index({ registrationNo: 1, userId: 1 }, { unique: true });

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

module.exports = Vehicle;