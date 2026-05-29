const mongoose = require("mongoose");
const {
  CLEANER_TYPE,
  CLEANING_TYPE,
} = require("../config/constants");

const cleanerProfileSchema = new mongoose.Schema(
  {
    // ─── Link to User ────────────────────────────────────
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: [true, "User is required"],
      unique:   true, // one profile per cleaner
    },

    // ─── Personal Details ────────────────────────────────
    dateOfBirth: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    // ─── ID Proof ────────────────────────────────────────
    aadharNo: {
      type:  String,
      trim:  true,
      match: [/^\d{12}$/, "Enter valid 12 digit Aadhar number"],
    },

    panNo: {
      type:    String,
      trim:    true,
      uppercase: true,
    },

    // ─── Documents Upload (S3 URLs) ──────────────────────
    aadharFrontPic: {
      type: String, // S3 URL
    },

    aadharBackPic: {
      type: String, // S3 URL
    },

    profilePic: {
      type: String, // S3 URL
    },

    // ─── Work Details ────────────────────────────────────
    cleanerType: {
      type:     String,
      enum:     Object.values(CLEANER_TYPE),
      required: [true, "Cleaner type is required"],
      // part_time → max 15 cars, 3hr slot
      // full_time → max 30 cars, 6hr slot
    },

    // Preferred cleaning types
    cleaningTypes: [{
      type: String,
      enum: Object.values(CLEANING_TYPE),
      // external, internal
    }],

    // ─── Work Area ───────────────────────────────────────
    preferredAreas: [{
      type: String,
      trim: true,
    }],

    preferredPinCodes: [{
      type:  String,
      trim:  true,
      match: [/^\d{6}$/, "Enter valid 6 digit pin code"],
    }],

    // ─── Bank Details (for salary payment) ──────────────
    bankDetails: {
      accountNo:   { type: String, trim: true },
      ifscCode:    { type: String, trim: true },
      bankName:    { type: String, trim: true },
      accountName: { type: String, trim: true },
    },

    upiId: {
      type:  String,
      trim:  true,
    },

    // ─── Emergency Contact ───────────────────────────────
    emergencyContact: {
      name:     { type: String, trim: true },
      mobileNo: { type: String, trim: true },
      relation: { type: String, trim: true },
    },

    // ─── Admin Review Notes ──────────────────────────────
    adminNote: {
      type: String,
    },

    // ─── Form Status ─────────────────────────────────────
    isFormComplete: {
      type:    Boolean,
      default: false,
      // true when all required fields are filled
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
cleanerProfileSchema.index({ userId: 1 });

const CleanerProfile = mongoose.model(
  "CleanerProfile",
  cleanerProfileSchema
);

module.exports = CleanerProfile;