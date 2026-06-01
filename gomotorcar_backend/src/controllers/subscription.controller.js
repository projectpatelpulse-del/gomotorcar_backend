const Subscription   = require("../models/subscription.model");
const Package        = require("../models/package.model");
const Vehicle        = require("../models/vehicle.model");
const asyncHandler   = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");
const crypto = require("crypto");

// ─────────────────────────────────────────────────────────
// HELPER: Generate QR Code string
// ─────────────────────────────────────────────────────────
const generateQRCode = (subscriptionId) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random    = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `GMC-${timestamp}-${random}`;
};

// ─────────────────────────────────────────────────────────
// @route   POST /api/subscriptions/book-demo
// @desc    Book free demo
// @access  Private (Customer only)
// ─────────────────────────────────────────────────────────
const bookDemo = asyncHandler(async (req, res) => {
  const { vehicleId, addressId, apartmentId } = req.body;

  // Check vehicle belongs to customer
  const vehicle = await Vehicle.findOne({
    _id:       vehicleId,
    userId:    req.user._id,
    isDeleted: false,
  });

  if (!vehicle) {
    return errorResponse(res, "Vehicle not found", 404);
  }

  // Check no active demo or subscription exists
  const existing = await Subscription.findOne({
    customerId: req.user._id,
    vehicleId,
    status:     "active",
    isDeleted:  false,
  });

  if (existing) {
    return errorResponse(
      res,
      "You already have an active subscription for this vehicle",
      409
    );
  }

  // Demo = 1 day, free, no payment
  const startDate = new Date();
  const endDate   = new Date();
  endDate.setDate(endDate.getDate() + 1);

  // Temp QR for demo
  const tempQR = generateQRCode("demo");

  const demo = await Subscription.create({
    customerId:        req.user._id,
    vehicleId,
    addressId,
    apartmentId,
    subscriptionType:  "demo",
    startDate,
    endDate,
    amount:            0,
    paymentStatus:     "success",
    status:            "active",
    qrCode:            tempQR,
    qrAllocatedAt:     new Date(),
    // Package fields = 0 for demo
    totalExternalCleanings: 1,
    totalInternalCleanings: 0,
  });

  return createdResponse(
    res,
    "Demo booked successfully",
    {
      subscription: demo,
      message:
        "Your demo has been booked. A cleaner will be assigned shortly.",
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/subscriptions/subscribe
// @desc    Customer subscribes to a package
// @access  Private (Customer only)
// ─────────────────────────────────────────────────────────
const subscribe = asyncHandler(async (req, res) => {
  const {
    packageId,
    vehicleId,
    addressId,
    apartmentId,
    startDate,
    paymentId,   // From payment gateway (Phase 6)
  } = req.body;

  // Validate package
  const pkg = await Package.findOne({
    _id:       packageId,
    isActive:  true,
    isDeleted: false,
  });

  if (!pkg) {
    return errorResponse(res, "Package not found", 404);
  }

  // Validate vehicle
  const vehicle = await Vehicle.findOne({
    _id:       vehicleId,
    userId:    req.user._id,
    isDeleted: false,
  });

  if (!vehicle) {
    return errorResponse(res, "Vehicle not found", 404);
  }

  // Check no active subscription for this vehicle
  const existing = await Subscription.findOne({
    customerId: req.user._id,
    vehicleId,
    status:     "active",
    isDeleted:  false,
  });

  if (existing) {
    return errorResponse(
      res,
      "Active subscription already exists for this vehicle",
      409
    );
  }

  // Calculate dates
  const subStartDate = startDate ? new Date(startDate) : new Date();
  const subEndDate   = new Date(subStartDate);
  subEndDate.setDate(subEndDate.getDate() + pkg.durationDays);

  // Generate QR Code
  // As per document: QR allocated after payment completion
  const qrCode = generateQRCode(packageId);

  const subscription = await Subscription.create({
    customerId:  req.user._id,
    packageId,
    vehicleId,
    addressId,
    apartmentId,
    subscriptionType:           "paid",
    startDate:                  subStartDate,
    endDate:                    subEndDate,
    amount:                     pkg.price,
    paymentStatus:              paymentId ? "success" : "pending",
    paymentId:                  paymentId || null,
    status:                     "active",
    qrCode:                     paymentId ? qrCode : null,
    qrAllocatedAt:              paymentId ? new Date() : null,
    totalExternalCleanings:     pkg.externalCleanings,
    totalInternalCleanings:     pkg.internalCleanings,
    completedExternalCleanings: 0,
    completedInternalCleanings: 0,
  });

  // Update vehicle QR if payment done
  if (paymentId) {
    await Vehicle.findByIdAndUpdate(vehicleId, {
      $set: {
        qrCode:            qrCode,
        qrCodeAllocatedAt: new Date(),
      },
    });
  }

  return createdResponse(
    res,
    "Subscription created successfully",
    { subscription }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/subscriptions/active
// @desc    Get customer's active subscription
// @access  Private (Customer only)
// ─────────────────────────────────────────────────────────
const getActiveSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({
    customerId: req.user._id,
    status:     "active",
    isDeleted:  false,
  })
    .populate("packageId",    "name durationDays price")
    .populate("vehicleId",    "registrationNo brand model")
    .populate("cleanerId",    "name profilePic mobileNo")
    .populate("supervisorId", "name mobileNo")
    .populate("apartmentId",  "name address");

  if (!subscription) {
    return errorResponse(
      res,
      "No active subscription found",
      404
    );
  }

  return successResponse(
    res,
    "Active subscription fetched successfully",
    { subscription }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/subscriptions/balance
// @desc    Get cleaning balance
// @access  Private (Customer only)
// ─────────────────────────────────────────────────────────
const getCleaningBalance = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({
    customerId: req.user._id,
    status:     "active",
    isDeleted:  false,
  });

  if (!subscription) {
    return errorResponse(res, "No active subscription found", 404);
  }

  // Calculate balance
  const externalBalance =
    subscription.totalExternalCleanings +
    subscription.carryForwardExternal -
    subscription.completedExternalCleanings;

  const internalBalance =
    subscription.totalInternalCleanings +
    subscription.carryForwardInternal -
    subscription.completedInternalCleanings;

  return successResponse(
    res,
    "Cleaning balance fetched successfully",
    {
      balance: {
        external: {
          total:     subscription.totalExternalCleanings,
          carryForward: subscription.carryForwardExternal,
          completed: subscription.completedExternalCleanings,
          remaining: externalBalance,
        },
        internal: {
          total:     subscription.totalInternalCleanings,
          carryForward: subscription.carryForwardInternal,
          completed: subscription.completedInternalCleanings,
          remaining: internalBalance,
        },
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/subscriptions/renew
// @desc    Renew current package
// @access  Private (Customer only)
// ─────────────────────────────────────────────────────────
const renewSubscription = asyncHandler(async (req, res) => {
  const { paymentId } = req.body;

  // Get current active subscription
  const current = await Subscription.findOne({
    customerId: req.user._id,
    status:     "active",
    isDeleted:  false,
  }).populate(
    "packageId",
    "name price durationDays externalCleanings internalCleanings"
  );

  // Check 1 — subscription exists
  if (!current) {
    return errorResponse(
      res,
      "No active subscription found",
      404
    );
  }

  // Check 2 — only paid subscriptions can be renewed
  if (current.subscriptionType === "demo") {
    return errorResponse(
      res,
      "Demo subscription cannot be renewed. Please subscribe to a paid package.",
      400
    );
  }

  // Check 3 — package details exist
  if (!current.packageId) {
    return errorResponse(
      res,
      "Package details not found for this subscription",
      404
    );
  }

  // Calculate carry forward balance
  const carryForwardExternal = Math.max(
    0,
    current.totalExternalCleanings -
    current.completedExternalCleanings
  );

  const carryForwardInternal = Math.max(
    0,
    current.totalInternalCleanings -
    current.completedInternalCleanings
  );

  // New subscription dates start from current end date
  const startDate = new Date(current.endDate);
  const endDate   = new Date(startDate);
  endDate.setDate(
    endDate.getDate() + current.packageId.durationDays
  );

  // Expire current subscription
  await Subscription.findByIdAndUpdate(current._id, {
    $set: { status: "expired" },
  });

  // Create new subscription — reuse same QR as per document
  const renewed = await Subscription.create({
    customerId:       current.customerId,
    packageId:        current.packageId._id,
    vehicleId:        current.vehicleId,
    addressId:        current.addressId,
    apartmentId:      current.apartmentId,
    cleanerId:        current.cleanerId,
    supervisorId:     current.supervisorId,
    subscriptionType: "paid",
    startDate,
    endDate,
    amount:           current.packageId.price,
    paymentStatus:    "success",
    paymentId,
    status:           "active",

    // Reuse same QR — as per document
    qrCode:        current.qrCode,
    qrAllocatedAt: current.qrAllocatedAt,

    // Carry forward balance
    carryForwardExternal,
    carryForwardInternal,

    totalExternalCleanings:     current.packageId.externalCleanings,
    totalInternalCleanings:     current.packageId.internalCleanings,
    completedExternalCleanings: 0,
    completedInternalCleanings: 0,

    // Track renewal chain
    renewedFrom:  current._id,
    renewalCount: current.renewalCount + 1,
  });

  return createdResponse(
    res,
    "Subscription renewed successfully",
    {
      subscription: renewed,
      carryForward: {
        external: carryForwardExternal,
        internal: carryForwardInternal,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/subscriptions/history
// @desc    Get per-day cleaning history
// @access  Private (Customer only)
// ─────────────────────────────────────────────────────────
const getSubscriptionHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const subscriptions = await Subscription.find({
    customerId: req.user._id,
    isDeleted:  false,
  })
    .populate("packageId", "name")
    .populate("vehicleId", "registrationNo brand model")
    .sort({ createdAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await Subscription.countDocuments({
    customerId: req.user._id,
    isDeleted:  false,
  });

  return successResponse(
    res,
    "Subscription history fetched successfully",
    {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      subscriptions,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/subscriptions/change-staff
// @desc    Customer requests cleaner/supervisor change
// @access  Private (Customer only)
// ─────────────────────────────────────────────────────────
const changeStaffRequest = asyncHandler(async (req, res) => {
  const { reason, staffType } = req.body;
  // staffType = "cleaner" | "supervisor"

  const subscription = await Subscription.findOne({
    customerId: req.user._id,
    status:     "active",
    isDeleted:  false,
  });

  if (!subscription) {
    return errorResponse(res, "No active subscription found", 404);
  }

  // For now saving request in subscription notes
  // In Phase 8 Supervisor module will handle this properly
  await Subscription.findByIdAndUpdate(subscription._id, {
    $set: {
      changeStaffRequest: {
        requestedAt: new Date(),
        staffType,
        reason,
        status: "pending",
      },
    },
  });

  return successResponse(
    res,
    "Staff change request submitted successfully. Our team will contact you shortly.",
    {
      subscriptionId: subscription._id,
      staffType,
      reason,
    }
  );
});

module.exports = {
  bookDemo,
  subscribe,
  getActiveSubscription,
  getCleaningBalance,
  renewSubscription,
  getSubscriptionHistory,
  changeStaffRequest,
};