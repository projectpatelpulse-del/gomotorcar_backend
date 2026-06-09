const mongoose = require("mongoose");

const workSessionSchema = new mongoose.Schema(
  {
    // ─── Links ───────────────────────────────────────────
    cleanerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    subscriptionId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Subscription",
      required: true,
    },

    customerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      // required: true,
    },

    vehicleId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Vehicle",
      required: true,
    },

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },

    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Apartment",
    },

    // ─── QR Data ─────────────────────────────────────────
    qrCode: {
      type:     String,
      required: true,
    },

    // ─── Cleaning Type ───────────────────────────────────
    cleaningType: {
      type:     String,
      enum:     ["external", "internal"],
      required: true,
    },

    // ─── Work Date ───────────────────────────────────────
    workDate: {
      type:     Date,
      required: true,
    },

    // ─── Geo Location at scan ────────────────────────────
    scanLocation: {
      type: {
        type:    String,
        enum:    ["Point"],
        default: "Point",
      },
      coordinates: {
        type:    [Number],
        default: [0, 0],
        // [longitude, latitude]
      },
    },

    // ─── Geo-fence validation ────────────────────────────
    isWithinGeoFence: {
      type:    Boolean,
      default: false,
    },

    // ─── Work Timing ─────────────────────────────────────
    startTime: {
      type: Date,
    },

    endTime: {
      type: Date,
    },

    // Duration in minutes
    duration: {
      type: Number,
    },

    // ─── Evidence ────────────────────────────────────────
    photoUrl: {
      type: String,
      // Photo taken after work completion
    },

    notes: {
      type: String,
    },

    // ─── Status ──────────────────────────────────────────
    status: {
      type:    String,
      enum:    [
        "scanned",              // QR scanned
        "in_progress",          // Work started
        "completed",            // Work ended
        "approved",             // Supervisor approved
        "redo",                 // Needs redo
        "rejected_by_customer", // Customer rejected
        "rejected_by_supervisor",
      ],
      default: "scanned",
    },

    // ─── Approval ────────────────────────────────────────
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },

    approvedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
    },

    // ─── Offline sync ────────────────────────────────────
    isOfflineSync: {
      type:    Boolean,
      default: false,
    },

    // Counts toward cleaner payout only if approved
    countsForPayout: {
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
workSessionSchema.index({ cleanerId: 1 });
workSessionSchema.index({ workDate: 1 });
workSessionSchema.index({ status: 1 });
workSessionSchema.index({ subscriptionId: 1 });
workSessionSchema.index({ scanLocation: "2dsphere" });

const WorkSession = mongoose.model(
  "WorkSession",
  workSessionSchema
);

module.exports = WorkSession;