const mongoose = require("mongoose");

const cleaningSessionSchema = new mongoose.Schema(
  {
    // ─── Links ───────────────────────────────────────────
    subscriptionId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Subscription",
      required: true,
    },

    cleanerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    customerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
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

    // ─── Cleaning Type ───────────────────────────────────
    cleaningType: {
      type:     String,
      enum:     ["external", "internal"],
      required: true,
    },

    // ─── QR Scan Data ────────────────────────────────────
    qrCode: {
      type: String,
    },

    // Location when QR was scanned
    scanLocation: {
      type: {
        type:    String,
        enum:    ["Point"],
        default: "Point",
      },
      coordinates: {
        type:    [Number],
        default: [0, 0],
      },
    },

    // ─── Work Timing ─────────────────────────────────────
    workDate: {
      type:     Date,
      required: true,
    },

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

    // ─── Status ──────────────────────────────────────────
    status: {
      type:    String,
      enum:    [
        "assigned",
        "in_progress",
        "completed",
        "approved",
        "rejected_by_customer",
        "rejected_by_supervisor",
        "redo",
      ],
      default: "assigned",
    },

    // ─── Approval ────────────────────────────────────────
    approvedBy: {
      type: String,
      enum: ["supervisor", "auto"],
    },

    approvedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
    },

    // ─── Evidence ────────────────────────────────────────
    // Photo taken by cleaner after work
    photoUrl: {
      type: String,
    },

    notes: {
      type: String,
    },

    // ─── Offline sync ────────────────────────────────────
    // Was this session captured offline
    isOfflineSync: {
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
cleaningSessionSchema.index({ subscriptionId: 1 });
cleaningSessionSchema.index({ cleanerId: 1 });
cleaningSessionSchema.index({ customerId: 1 });
cleaningSessionSchema.index({ workDate: 1 });
cleaningSessionSchema.index({ status: 1 });
cleaningSessionSchema.index({ scanLocation: "2dsphere" });

const CleaningSession = mongoose.model(
  "CleaningSession",
  cleaningSessionSchema
);

module.exports = CleaningSession;