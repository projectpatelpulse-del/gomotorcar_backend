const mongoose = require("mongoose");

// Service pricing schema (reusable)
const pricingSchema = new mongoose.Schema({
  hatchback: { type: Number, default: 0 },
  sedan:     { type: Number, default: 0 },
  suv:       { type: Number, default: 0 },
  luxury:    { type: Number, default: 0 },
}, { _id: false });

// Single service schema
const serviceSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  "Service",
    // Will link to service catalogue in Phase 4
  },
  serviceName: {
    type:     String,
    required: true,
    trim:     true,
  },
  serviceMode: {
    type: String,
    enum: ["at_works", "door_step", "both"],
    // at_works = customer comes to shop
    // door_step = provider goes to customer
  },
  pricing: pricingSchema,
}, { _id: true });

const ncspProfileSchema = new mongoose.Schema(
  {
    // ─── Link to User ──────────────────────────────────
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: [true, "User is required"],
      unique:   true,
    },

    // ─── Business Details ──────────────────────────────
    businessName: {
      type:     String,
      required: [true, "Business name is required"],
      trim:     true,
    },

    ownerName: {
      type:     String,
      required: [true, "Owner name is required"],
      trim:     true,
    },

    contactPersonName: {
      type:  String,
      trim:  true,
    },

    contactPersonMobile: {
      type:  String,
      trim:  true,
    },

    businessEmail: {
      type:  String,
      trim:  true,
      lowercase: true,
    },

    // ─── GST Details ───────────────────────────────────
    gstNo: {
      type:  String,
      trim:  true,
    },

    gstCertificatePic: {
      type: String, // S3 URL
    },

    // ─── Business Address ──────────────────────────────
    businessAddress: {
      line1:    { type: String, trim: true },
      landmark: { type: String, trim: true },
      city:     { type: String, trim: true },
      state:    { type: String, trim: true },
      pinCode:  { type: String, trim: true },
    },

    // GeoJSON for location based search
    location: {
      type: {
        type:    String,
        enum:    ["Point"],
        default: "Point",
      },
      coordinates: {
        type:    [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

    // ─── Services ──────────────────────────────────────
    // A2Z services — any car service
    services: [serviceSchema],

    // ─── Business Images ───────────────────────────────
    businessImages: [{
      type: String, // S3 URLs
    }],

    logoImage: {
      type: String, // S3 URL
    },

    // ─── Working Hours ─────────────────────────────────
    workingHours: {
      openTime:  { type: String }, // "09:00"
      closeTime: { type: String }, // "18:00"
    },

    workingDays: [{
      type: String,
      enum: ["mon","tue","wed","thu","fri","sat","sun"],
    }],

    // ─── Bank Details ──────────────────────────────────
    bankDetails: {
      accountNo:   { type: String, trim: true },
      ifscCode:    { type: String, trim: true },
      bankName:    { type: String, trim: true },
      accountName: { type: String, trim: true },
    },

    // ─── App Status ────────────────────────────────────
    // active = appears in customer search
    // inactive = hidden from customer search
    appStatus: {
      type:    String,
      enum:    ["active", "inactive"],
      default: "inactive",
      // becomes active after admin approval + payment
    },

    // ─── Admin Review Notes ────────────────────────────
    adminNote: {
      type: String,
    },

    isFormComplete: {
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

// ─── Indexes ────────────────────────────────────────────
ncspProfileSchema.index({ location: "2dsphere" });
ncspProfileSchema.index({ appStatus: 1 });

const NCSPProfile = mongoose.model("NCSPProfile", ncspProfileSchema);

module.exports = NCSPProfile;