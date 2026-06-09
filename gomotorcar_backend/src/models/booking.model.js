const mongoose = require("mongoose");

// Job card line item schema
const jobCardItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity:    { type: Number, default: 1 },
  unitPrice:   { type: Number, required: true },
  totalPrice:  { type: Number, required: true },
  warrantyDays:{ type: Number, default: 0 },
  warrantyNote:{ type: String },
}, { _id: true });

const bookingSchema = new mongoose.Schema(
  {
    // ─── Booking ID ──────────────────────────────────────
    bookingNo: {
      type:   String,
      unique: true,
      // e.g. "GMC-BK-00001"
    },

    // ─── Parties ─────────────────────────────────────────
    customerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    franchiseId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // ─── Service ─────────────────────────────────────────
    serviceId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Service",
      required: true,
    },

    serviceName: {
      type: String,
      // Snapshot at booking time
    },

    // ─── Vehicle ─────────────────────────────────────────
    vehicleId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Vehicle",
      required: true,
    },

    vehicleCategory: {
      type: String,
      enum: ["hatchback", "sedan", "suv", "luxury", "other"],
    },

    // ─── Slot ────────────────────────────────────────────
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Slot",
    },

    scheduledDate: {
      type: Date,
    },

    scheduledTime: {
      type: String,
      // e.g. "10:00"
    },

    // ─── Service Mode ────────────────────────────────────
    serviceMode: {
      type:    String,
      enum:    ["at_works", "door_step", "pickup_drop"],
      required: true,
    },

    // ─── Addresses ───────────────────────────────────────
    // Customer address for door step service
    customerAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Address",
    },

    // Pickup address if pickup_drop mode
    pickupAddress: {
      type: String,
    },

    // ─── Booking Status ──────────────────────────────────
    // As per UI: Assigned → In Transit → Started → Done
    status: {
      type:    String,
      enum:    [
        "pending",      // Waiting franchise acceptance
        "confirmed",    // Franchise accepted
        "assigned",     // Technician assigned
        "in_transit",   // On the way
        "started",      // Work started
        "completed",    // Work done
        "cancelled",    // Cancelled
      ],
      default: "pending",
    },

    // ─── Franchise Response ──────────────────────────────
    franchiseResponse: {
      type: String,
      enum: ["pending", "accepted", "rejected", "hold"],
      default: "pending",
    },

    holdTill: {
      type: Date,
    },

    rejectionReason: {
      type: String,
    },

    // ─── Job Card ────────────────────────────────────────
    jobCard: {
      items:            [jobCardItemSchema],
      originalAmount:   { type: Number, default: 0 },
      revisedAmount:    { type: Number, default: 0 },
      customerApproved: { type: Boolean, default: false },
      approvedAt:       { type: Date },
      notes:            { type: String },
    },

    // ─── Payment ─────────────────────────────────────────
    paymentMode: {
      type:    String,
      enum:    ["online", "cash", "wallet"],
      default: "online",
    },

    // Advance or pay after
    paymentType: {
      type:    String,
      enum:    ["advance", "pay_after"],
      default: "pay_after",
    },

    amount: {
      type:    Number,
      default: 0,
    },

    taxAmount: {
      type:    Number,
      default: 0,
    },

    totalAmount: {
      type:    Number,
      default: 0,
    },

    paymentStatus: {
      type:    String,
      enum:    ["pending", "success", "failed", "refunded"],
      default: "pending",
    },

    paymentId: {
      type: String,
    },

    // ─── Tracking ────────────────────────────────────────
    assignedAt:   { type: Date },
    inTransitAt:  { type: Date },
    startedAt:    { type: Date },
    completedAt:  { type: Date },
    cancelledAt:  { type: Date },

    cancellationReason: {
      type: String,
    },

    // ─── Ratings ─────────────────────────────────────────
    rating: {
      stars:   { type: Number, min: 1, max: 5 },
      comment: { type: String },
      ratedAt: { type: Date },
    },

    // ─── Invoice ─────────────────────────────────────────
    invoiceUrl: {
      type: String,
      // S3 URL of generated invoice PDF
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
bookingSchema.index({ customerId: 1 });
bookingSchema.index({ franchiseId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ scheduledDate: 1 });

// ─── Auto generate booking number ────────────────────────
bookingSchema.pre("save", async function () {
  if (!this.bookingNo) {
    const count = await mongoose.model("Booking").countDocuments();
    const padded = String(count + 1).padStart(5, "0");
    this.bookingNo = `GMC-BK-${padded}`;
  }
});

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;