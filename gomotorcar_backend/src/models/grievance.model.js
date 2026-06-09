const mongoose = require("mongoose");

// Message thread schema
const messageSchema = new mongoose.Schema({
  senderId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      "User",
    required: true,
  },
  senderRole: {
    type: String,
  },
  message: {
    type:     String,
    required: true,
  },
  attachments: [{
    type: String, // S3 URLs
  }],
  sentAt: {
    type:    Date,
    default: Date.now,
  },
}, { _id: true });

const grievanceSchema = new mongoose.Schema(
  {
    // ─── Raised by ───────────────────────────────────────
    raisedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    raisedByRole: {
      type: String,
      // CU, CL, NC, FR etc
    },

    // ─── Type ────────────────────────────────────────────
    type: {
      type:    String,
      enum:    [
        "cleaning_issue",
        "payment_issue",
        "service_issue",
        "app_issue",
        "staff_issue",
        "other",
      ],
      required: true,
    },

    // ─── Subject ─────────────────────────────────────────
    subject: {
      type:     String,
      required: [true, "Subject is required"],
      trim:     true,
    },

    description: {
      type:     String,
      required: [true, "Description is required"],
    },

    // ─── Supporting Photos ───────────────────────────────
    photos: [{
      type: String, // S3 URLs
    }],

    // ─── Reference ───────────────────────────────────────
    // e.g. booking ID, subscription ID
    refId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    refModel: {
      type: String,
      enum: ["Booking", "Subscription", "WorkSession"],
    },

    // ─── Status ──────────────────────────────────────────
    status: {
      type:    String,
      enum:    [
        "open",
        "in_progress",
        "resolved",
        "escalated",
        "closed",
      ],
      default: "open",
    },

    // ─── Resolution ──────────────────────────────────────
    resolution: {
      type: String,
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },

    resolvedAt: {
      type: Date,
    },

    // ─── Escalation ──────────────────────────────────────
    isEscalated: {
      type:    Boolean,
      default: false,
    },

    escalatedAt: {
      type: Date,
    },

    // ─── Message Thread ──────────────────────────────────
    messages: [messageSchema],

    // ─── Ticket ID ───────────────────────────────────────
    ticketNo: {
      type:   String,
      unique: true,
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

// ─── Auto generate ticket number ─────────────────────────
grievanceSchema.pre("save", async function () {
  if (!this.ticketNo) {
    const count = await mongoose.model("Grievance").countDocuments();
    const padded = String(count + 1).padStart(5, "0");
    this.ticketNo = `GMC-TK-${padded}`;
  }
});

// ─── Indexes ──────────────────────────────────────────────
grievanceSchema.index({ raisedBy: 1 });
grievanceSchema.index({ status: 1 });

grievanceSchema.index({ type: 1 });

const Grievance = mongoose.model("Grievance", grievanceSchema);

module.exports = Grievance;