const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    // ─── Who rated ───────────────────────────────────────
    ratedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    raterRole: {
      type: String,
      // CU, CL, SU etc
    },

    // ─── Who was rated ───────────────────────────────────
    ratedEntity: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    entityType: {
      type:    String,
      enum:    ["cleaner", "franchise", "ncsp"],
      required: true,
    },

    // ─── Rating ──────────────────────────────────────────
    stars: {
      type:     Number,
      required: true,
      min:      1,
      max:      5,
    },

    comment: {
      type: String,
      trim: true,
    },

    // ─── Reference ───────────────────────────────────────
    // Which booking or session this rating is for
    refId: {
      type: mongoose.Schema.Types.ObjectId,
    },

 refModel: {
  type: String,
  enum: [
    "Booking",
    "WorkSession",
    "Subscription",
  ],
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
ratingSchema.index({ ratedEntity: 1 });
ratingSchema.index({ entityType:  1 });
ratingSchema.index({ ratedBy:     1 });
ratingSchema.index({ stars:       1 });

const Rating = mongoose.model("Rating", ratingSchema);

module.exports = Rating;