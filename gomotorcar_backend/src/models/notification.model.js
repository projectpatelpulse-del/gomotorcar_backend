const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // ─── Recipient ───────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
      // null = broadcast to all
    },

    // Target specific roles
    targetRoles: [{
      type: String,
      // e.g. ["CU"] = all customers
      // ["CL", "SU"] = cleaners and supervisors
    }],

    // ─── Content ─────────────────────────────────────────
    title: {
      type:     String,
      required: [true, "Title is required"],
      trim:     true,
    },

    message: {
      type:     String,
      required: [true, "Message is required"],
    },

    // ─── Type ────────────────────────────────────────────
    type: {
      type:    String,
      enum:    [
        "booking_status",
        "service_status",
        "payment_status",
        "cleaning_done",
        "offer",
        "approval",
        "grievance_update",
        "package_renewal",
        "general",
        "broadcast",
      ],
      default: "general",
    },

    // ─── Reference ───────────────────────────────────────
    refId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    refModel: {
      type: String,
    },

    // ─── Read Status ─────────────────────────────────────
    isRead: {
      type:    Boolean,
      default: false,
    },

    readAt: {
      type: Date,
    },

    // ─── Broadcast ───────────────────────────────────────
    isBroadcast: {
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
notificationSchema.index({ userId: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

module.exports = Notification;