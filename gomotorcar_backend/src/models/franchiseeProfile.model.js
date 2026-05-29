const mongoose = require("mongoose");

const pricingSchema = new mongoose.Schema({
  hatchback: { type: Number, default: 0 },
  sedan:     { type: Number, default: 0 },
  suv:       { type: Number, default: 0 },
  luxury:    { type: Number, default: 0 },
}, { _id: false });

const serviceSchema = new mongoose.Schema({
  serviceName: {
    type:     String,
    required: true,
    trim:     true,
  },
  serviceMode: {
    type: String,
    enum: ["at_works", "door_step", "both"],
  },
  pricing:     pricingSchema,
  isAvailable: {
    type:    Boolean,
    default: true,
  },
}, { _id: true });

const franchiseeProfileSchema = new mongoose.Schema(
  {
    // ─── Link to User ──────────────────────────────────
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: [true, "User is required"],
      unique:   true,
    },

    // ─── Franchise Type ────────────────────────────────
    // FR = CSP (geo location based search)
    // FS = Steam Car Wash (pin code based search)
    franchiseType: {
      type:     String,
      enum:     ["csp", "steam_wash"],
      required: [true, "Franchise type is required"],
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
      type: String,
    },

    // ─── Workshop / Business Address ───────────────────
    businessAddress: {
      line1:    { type: String, trim: true },
      landmark: { type: String, trim: true },
      city:     { type: String, trim: true },
      state:    { type: String, trim: true },
      pinCode:  { type: String, trim: true },
    },

    // GeoJSON — for CSP geo location search
    location: {
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

    // ─── Pin Codes Served ──────────────────────────────
    // For Steam Car Wash — pin code based search
    // Individual pin code entries or range
    servicePinCodes: [{
      type:  String,
      trim:  true,
      match: [/^\d{6}$/, "Enter valid 6 digit pin code"],
    }],

    // ─── Services ──────────────────────────────────────
    // CSP services from document:
    // 1. Periodic Service  2. Wheel Care
    // 3. AC Care           4. Battery Replacement
    // 5. Car Detailing     6. Steam Car Wash
    services: [serviceSchema],

    // ─── Working Hours ─────────────────────────────────
    workingHours: {
      openTime:  { type: String }, // "09:00"
      closeTime: { type: String }, // "20:00"
    },

    workingDays: [{
      type: String,
      enum: ["mon","tue","wed","thu","fri","sat","sun"],
    }],

    // Weekly off days
    weeklyOff: [{
      type: String,
      enum: ["mon","tue","wed","thu","fri","sat","sun"],
    }],

    // ─── Steam Car Wash Specific ───────────────────────
    // Only for FS role
    vanDetails: {
      vanNo:        { type: String, trim: true },
      vanModel:     { type: String, trim: true },
      equipmentDetails: { type: String, trim: true },
    },

    // ─── Business Images ───────────────────────────────
    businessImages: [{
      type: String, // S3 URLs
    }],

    logoImage: {
      type: String,
    },

    // ─── Payment Mode Supported ────────────────────────
    paymentModes: [{
      type: String,
      enum: ["online", "cash", "wallet"],
    }],

    // ─── Bank Details ──────────────────────────────────
    bankDetails: {
      accountNo:   { type: String, trim: true },
      ifscCode:    { type: String, trim: true },
      bankName:    { type: String, trim: true },
      accountName: { type: String, trim: true },
    },

    // ─── App Status ────────────────────────────────────
    appStatus: {
      type:    String,
      enum:    ["active", "inactive"],
      default: "inactive",
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
franchiseeProfileSchema.index({ userId: 1 });
franchiseeProfileSchema.index({ location: "2dsphere" });
franchiseeProfileSchema.index({ servicePinCodes: 1 });
franchiseeProfileSchema.index({ franchiseType: 1 });
franchiseeProfileSchema.index({ appStatus: 1 });

const FranchiseeProfile = mongoose.model(
  "FranchiseeProfile",
  franchiseeProfileSchema
);

module.exports = FranchiseeProfile;