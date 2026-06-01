const mongoose = require("mongoose");

const apartmentSchema = new mongoose.Schema(
  {
    // ─── Basic Info ──────────────────────────────────────
    name: {
      type:     String,
      required: [true, "Apartment name is required"],
      trim:     true,
    },

    society: {
      type:  String,
      trim:  true,
    },

    // ─── Address ─────────────────────────────────────────
    address: {
      line1:    { type: String, trim: true },
      landmark: { type: String, trim: true },
      city:     { type: String, trim: true },
      state:    { type: String, trim: true },
      pinCode:  { type: String, trim: true },
    },

    // ─── Geo Location ────────────────────────────────────
    // Polygon for geo-fencing
    // Cleaner must be inside this polygon to scan QR
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

    // Geo-fence radius in meters
    geoFenceRadius: {
      type:    Number,
      default: 100, // 100 meters
    },

    // ─── Cluster Info ────────────────────────────────────
    // Car cluster type as per document
    clusterType: {
      type: String,
      enum: [
        "apartment",
        "gated_community",
        "villa_community",
        "locality",
      ],
      default: "apartment",
    },

    // ─── QR Code Series ──────────────────────────────────
    // Each apartment has its own QR code series
    qrCodePrefix: {
      type:  String,
      trim:  true,
      // e.g. "APT001", "APT002"
    },

    // ─── Assigned Staff ──────────────────────────────────
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },

    // ─── Status ──────────────────────────────────────────
    isActive: {
      type:    Boolean,
      default: false,
      // Becomes active after admin approval
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
apartmentSchema.index({ location: "2dsphere" });
apartmentSchema.index({ isActive: 1 });
apartmentSchema.index({ supervisorId: 1 });

const Apartment = mongoose.model("Apartment", apartmentSchema);

module.exports = Apartment;