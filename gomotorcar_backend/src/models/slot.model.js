const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    // ─── Franchise ───────────────────────────────────────
    franchiseId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // ─── Date and Time ───────────────────────────────────
    date: {
      type:     Date,
      required: true,
    },

    startTime: {
      type:     String,
      required: true,
      // e.g. "09:00"
    },

    endTime: {
      type:     String,
      required: true,
      // e.g. "10:00"
    },

    // ─── Status ──────────────────────────────────────────
    isBooked: {
      type:    Boolean,
      default: false,
    },

    isBlocked: {
      type:    Boolean,
      default: false,
      // Franchise can block slots manually
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Booking",
      // Filled when slot is booked
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
slotSchema.index({ franchiseId: 1, date: 1 });
slotSchema.index({ isBooked: 1 });

const Slot = mongoose.model("Slot", slotSchema);

module.exports = Slot;