const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    // ─── Banner Info ─────────────────────────────────────
    title: {
      type:     String,
      required: [true, "Banner title is required"],
      trim:     true,
    },

    description: {
      type:  String,
      trim:  true,
    },

    // ─── Image ───────────────────────────────────────────
    imageUrl: {
      type:     String,
      required: [true, "Banner image is required"],
      // S3 URL
    },

    // ─── Action ──────────────────────────────────────────
    // What happens when customer clicks banner
    actionType: {
      type: String,
      enum: [
        "none",
        "booking",
        "subscription",
        "search",
        "url",
      ],
      default: "none",
    },

    actionUrl: {
      type: String,
      // External URL or deep link
    },

    // ─── Placement ───────────────────────────────────────
    // Where banner appears in app
    placement: {
      type:    String,
      enum:    ["home", "subscribe", "booking", "search"],
      default: "home",
    },

    // ─── Display ─────────────────────────────────────────
    sortOrder: {
      type:    Number,
      default: 0,
    },

    // ─── Validity ────────────────────────────────────────
    validFrom: {
      type: Date,
    },

    validTo: {
      type: Date,
    },

    isActive: {
      type:    Boolean,
      default: true,
    },

    isDeleted: {
      type:    Boolean,
      default: false,
    },

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
bannerSchema.index({ placement: 1, isActive: 1 });
bannerSchema.index({ sortOrder: 1 });

const Banner = mongoose.model("Banner", bannerSchema);

module.exports = Banner;