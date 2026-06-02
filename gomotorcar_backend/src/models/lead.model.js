const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    // ─── Who contacted ───────────────────────────────────
    customerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // ─── Which provider ──────────────────────────────────
    providerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    ncspProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "NCSPProfile",
    },

    // ─── Contact Channel ─────────────────────────────────
    channel: {
      type:    String,
      enum:    ["call", "whatsapp"],
      required: true,
    },

    // ─── Service Interest ─────────────────────────────────
    serviceInterest: {
      type:  String,
      trim:  true,
      // Which service customer searched for
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Category",
    },

    // ─── Lead Status ─────────────────────────────────────
    status: {
      type:    String,
      enum:    ["new", "contacted", "converted", "lost"],
      default: "new",
    },

    notes: {
      type: String,
    },

    // ─── Customer Location at time of search ─────────────
    searchLocation: {
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
leadSchema.index({ providerId: 1 });
leadSchema.index({ customerId: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ createdAt: -1 });

const Lead = mongoose.model("Lead", leadSchema);

module.exports = Lead;