const mongoose = require("mongoose");
const {
  ROLES,
  USER_STATUS,
  ENTITY_TYPE,
} = require("../config/constants");

const userSchema = new mongoose.Schema(
  {
    // ─── Identity ────────────────────────────────────────
    partnerId: {
      type:   String,
      unique: true,
      sparse: true, // NULL allowed for unnapproved users
    },

    mobileNo: {
      type:     String,
      required: [true, "Mobile number is required"],
      unique:   true,
      trim:     true,
      match:    [/^[6-9]\d{9}$/, "Enter a valid 10 digit Indian mobile number"],
    },

    role: {
      type:     String,
      enum:     Object.values(ROLES),
      required: [true, "Role is required"],
    },

    entityType: {
      type: String,
      enum: Object.values(ENTITY_TYPE),
      // only for self-registered partners
    },

    status: {
      type:    String,
      enum:    Object.values(USER_STATUS),
      default: USER_STATUS.PENDING_APPROVAL,
    },

    // ─── Personal Info ───────────────────────────────────
    name: {
      type:  String,
      trim:  true,
    },

    businessName: {
      type:  String,
      trim:  true,
    },

    email: {
      type:  String,
      trim:  true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email"],
    },

    profilePic: {
      type: String, // S3 URL later
    },

    // ─── Address ─────────────────────────────────────────
    address: {
      line1:    { type: String, trim: true },
      landmark: { type: String, trim: true },
      city:     { type: String, trim: true },
      state:    { type: String, trim: true },
      pinCode:  { type: String, trim: true },
    },

    // ─── Business Info (NCSP / Franchise) ────────────────
    gstNo: {
      type:  String,
      trim:  true,
    },

    // ─── Session Management ──────────────────────────────
    // Used to enforce single sign-in for Car Cleaners
    sessionToken: {
      type: String,
    },

    lastLoginAt: {
      type: Date,
    },

    // ─── Admin tracking ──────────────────────────────────
    // Who created this user (for admin-created roles)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },

    // Who approved this user
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },

    approvedAt: {
      type: Date,
    },

    activatedAt: {
      type: Date,
    },

    // ─── Soft delete ─────────────────────────────────────
    isDeleted: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // auto adds createdAt, updatedAt
  }
);

// ─── Indexes ─────────────────────────────────────────────
// userSchema.index({ mobileNo: 1 });

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
// userSchema.index({ partnerId: 1 });

const User = mongoose.model("User", userSchema);

module.exports = User;