const mongoose = require("mongoose");

const policySchema = new mongoose.Schema(
  {
    // ─── Policy Type ─────────────────────────────────────
    type: {
      type:    String,
      enum:    [
        "terms_and_conditions",
        "privacy_policy",
        "refund_policy",
        "cancellation_policy",
      ],
      required: true,
      unique:   true,
    },

    title: {
      type:     String,
      required: true,
      trim:     true,
    },

    // ─── Content ─────────────────────────────────────────
    content: {
      type:     String,
      required: [true, "Policy content is required"],
    },

    // ─── Version ─────────────────────────────────────────
    version: {
      type:    String,
      default: "1.0",
    },

    isActive: {
      type:    Boolean,
      default: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },
  },
  {
    timestamps: true,
  }
);

const Policy = mongoose.model("Policy", policySchema);

module.exports = Policy;
