const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    // ─── Customer ────────────────────────────────────────
    customerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: [true, "Customer is required"],
    },

    // ─── Package ─────────────────────────────────────────
    packageId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Package",
      // required: [true, "Package is required"],
    },

    // ─── Vehicle ─────────────────────────────────────────
    vehicleId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Vehicle",
      required: [true, "Vehicle is required"],
    },

    // ─── Address / Location ──────────────────────────────
    addressId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Address",
    },

    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Apartment",
    },

    // ─── Assigned Staff ──────────────────────────────────
    cleanerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },

    // ─── QR Code ─────────────────────────────────────────
    qrCode: {
      type:   String,
      sparse: true,
      // Allocated after payment
      // Same QR used on renewal
    },

    qrAllocatedAt: {
      type: Date,
    },

    // ─── Dates ───────────────────────────────────────────
    startDate: {
      type:     Date,
      required: [true, "Start date is required"],
    },

    endDate: {
      type:     Date,
      required: [true, "End date is required"],
    },

    // ─── Type ────────────────────────────────────────────
    // demo = free demo, no payment
    // paid = actual subscription
    subscriptionType: {
      type:    String,
      enum:    ["demo", "paid"],
      default: "paid",
    },

    // ─── Cleaning Balance ────────────────────────────────
    // Package vs Actual tracking
    totalExternalCleanings: {
      type:    Number,
      default: 0,
      // From package
    },

    totalInternalCleanings: {
      type:    Number,
      default: 0,
      // From package
    },

    completedExternalCleanings: {
      type:    Number,
      default: 0,
      // Actual done
    },

    completedInternalCleanings: {
      type:    Number,
      default: 0,
      // Actual done
    },

    // Carry forward from previous package
    carryForwardExternal: {
      type:    Number,
      default: 0,
    },

    carryForwardInternal: {
      type:    Number,
      default: 0,
    },

    // ─── Payment ─────────────────────────────────────────
    amount: {
      type:    Number,
      default: 0,
    },

    paymentStatus: {
      type:    String,
      enum:    ["pending", "success", "failed"],
      default: "pending",
    },

    paymentId: {
      type: String,
      // Payment gateway reference
    },

    // ─── Status ──────────────────────────────────────────
    status: {
      type:    String,
      enum:    ["active", "expired", "cancelled", "paused"],
      default: "active",
    },

    // ─── Renewal Tracking ────────────────────────────────
    renewedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Subscription",
      // Points to previous subscription
    },

    renewalCount: {
      type:    Number,
      default: 0,
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
subscriptionSchema.index({ customerId: 1 });
subscriptionSchema.index({ cleanerId: 1 });
subscriptionSchema.index({ supervisorId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ vehicleId: 1 });
subscriptionSchema.index({ endDate: 1 });

const Subscription = mongoose.model(
  "Subscription",
  subscriptionSchema
);

module.exports = Subscription;