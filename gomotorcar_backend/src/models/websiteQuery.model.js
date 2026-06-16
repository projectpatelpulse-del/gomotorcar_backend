const mongoose = require("mongoose");

const websiteQuerySchema = new mongoose.Schema(
  {
    // ─── From ────────────────────────────────────────────
    name: {
      type:     String,
      required: [true, "Name is required"],
      trim:     true,
    },

    email: {
      type:  String,
      trim:  true,
      lowercase: true,
    },

    mobileNo: {
      type:  String,
      trim:  true,
    },

    // ─── Query ───────────────────────────────────────────
    // Type from dropdown menu as per document
    queryType: {
      type:    String,
      enum:    [
        "general",
        "franchise_enquiry",
        "ncsp_enquiry",
        "customer_support",
        "complaint",
        "other",
      ],
      default: "general",
    },

    subject: {
      type:     String,
      required: [true, "Subject is required"],
      trim:     true,
    },

    message: {
      type:     String,
      required: [true, "Message is required"],
    },

    // ─── Status ──────────────────────────────────────────
    status: {
      type:    String,
      enum:    ["new", "in_progress", "resolved", "closed"],
      default: "new",
    },

    // ─── Admin Reply ─────────────────────────────────────
    reply: {
      type: String,
    },

    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },

    repliedAt: {
      type: Date,
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
websiteQuerySchema.index({ status: 1 });
websiteQuerySchema.index({ queryType: 1 });
websiteQuerySchema.index({ createdAt: -1 });

const WebsiteQuery = mongoose.model(
  "WebsiteQuery",
  websiteQuerySchema
);

module.exports = WebsiteQuery;