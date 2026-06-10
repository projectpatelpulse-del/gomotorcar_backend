const WorkSession  = require("../models/workSession.model");
const Subscription = require("../models/subscription.model");
const Inventory    = require("../models/inventory.model");
const QRStock      = require("../models/qrStock.model");
const User         = require("../models/user.model");
const Vehicle      = require("../models/vehicle.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");
const { ROLES, CLEANER_CAPACITY } = require("../config/constants");
const crypto = require("crypto");

// ─────────────────────────────────────────────────────────
// @route   GET /api/supervisor/home
// @desc    Supervisor home dashboard
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const getSupervisorHome = asyncHandler(async (req, res) => {
  const supervisorId = req.user._id;

  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get all active subscriptions under this supervisor
  const subscriptions = await Subscription.find({
    supervisorId,
    status:    "active",
    isDeleted: false,
  });

  // Unique counts
  const apartments = [
    ...new Set(
      subscriptions
        .map((s) => s.apartmentId?.toString())
        .filter(Boolean)
    ),
  ];

  const customers = [
    ...new Set(
      subscriptions.map((s) => s.customerId?.toString())
    ),
  ];

  const cleaners = [
    ...new Set(
      subscriptions
        .map((s) => s.cleanerId?.toString())
        .filter(Boolean)
    ),
  ];

  // Today's work
  const todaySessions = await WorkSession.find({
    supervisorId,
    workDate:  { $gte: today, $lt: tomorrow },
    isDeleted: false,
  });

  const assigned  = todaySessions.length;
  const done      = todaySessions.filter(
    (s) => ["completed", "approved"].includes(s.status)
  ).length;

  // Pending approvals
  const pendingApprovals = await WorkSession.countDocuments({
    supervisorId,
    status:    "completed",
    isDeleted: false,
  });

  // Open grievances
  const openGrievances = await WorkSession.countDocuments({
    supervisorId,
    status:    "rejected_by_customer",
    isDeleted: false,
  });

  return successResponse(
    res,
    "Supervisor home fetched successfully",
    {
      home: {
        name:             req.user.name,
        partnerId:        req.user.partnerId,
        apartmentsCount:  apartments.length,
        customersCount:   customers.length,
        carsCount:        subscriptions.length,
        cleanersCount:    cleaners.length,
        todayWork: {
          assigned,
          done,
          completionPercent: assigned > 0
            ? Math.round((done / assigned) * 100)
            : 0,
        },
        pendingApprovals,
        openGrievances,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/supervisor/onboarding/queue
// @desc    Get new customers pending QR onboarding
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const getOnboardingQueue = asyncHandler(async (req, res) => {
  // Subscriptions without QR allocated
  const pending = await Subscription.find({
    supervisorId: req.user._id,
    status:       "active",
    isDeleted:    false,
    $or: [
      { qrCode: null },
      { qrCode: { $exists: false } },
    ],
  })
    .populate("customerId", "name mobileNo")
    .populate("vehicleId",  "registrationNo brand model")
    .populate("apartmentId","name address")
    .sort({ createdAt: -1 });

  return successResponse(
    res,
    "Onboarding queue fetched successfully",
    {
      count:   pending.length,
      pending,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/supervisor/onboarding/qr-scan
// @desc    Validate QR and bind to customer car
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const onboardQRScan = asyncHandler(async (req, res) => {
  const {
    subscriptionId,
    qrCode,
    qrIdentificationNo,
    vehicleNo,
    photoUrl,
  } = req.body || {};

  if (!subscriptionId || (!qrCode && !qrIdentificationNo)) {
    return errorResponse(
      res,
      "Subscription ID and QR code are required",
      400
    );
  }

  // Find subscription
  const subscription = await Subscription.findOne({
    _id:          subscriptionId,
    supervisorId: req.user._id,
    status:       "active",
    isDeleted:    false,
  })
    .populate("customerId", "name mobileNo")
    .populate("vehicleId",  "registrationNo brand");

  if (!subscription) {
    return errorResponse(res, "Subscription not found", 404);
  }

  // Check QR not already used by another subscription
  const qrToUse = qrCode || qrIdentificationNo;
  const existing = await Subscription.findOne({
    qrCode:    qrToUse,
    _id:       { $ne: subscriptionId },
    isDeleted: false,
  });

  if (existing) {
    return errorResponse(
      res,
      "This QR code is already assigned to another vehicle",
      409
    );
  }

  // Update subscription with QR
  await Subscription.findByIdAndUpdate(subscriptionId, {
    $set: {
      qrCode:        qrToUse,
      qrAllocatedAt: new Date(),
    },
  });

  // Update QR stock status
  await QRStock.findOneAndUpdate(
    { qrCode: qrToUse, supervisorId: req.user._id },
    {
      $set: {
        status:           "allocated",
        allocatedTo:      subscription.customerId._id,
        allocatedVehicle: subscription.vehicleId._id,
        allocatedAt:      new Date(),
      },
    }
  );

  // Update vehicle with QR
  await Vehicle.findByIdAndUpdate(subscription.vehicleId._id, {
    $set: {
      qrCode:            qrToUse,
      qrCodeAllocatedAt: new Date(),
    },
  });

  return successResponse(
    res,
    "QR code assigned successfully. Onboarding complete.",
    {
      subscriptionId,
      qrCode:   qrToUse,
      customer: subscription.customerId,
      vehicle:  subscription.vehicleId,
      status:   "completed",
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/supervisor/onboarding/qr-reassign
// @desc    Replace damaged or lost QR code
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const reassignQR = asyncHandler(async (req, res) => {
  const { subscriptionId, newQrCode, reason } = req.body || {};

  if (!subscriptionId || !newQrCode) {
    return errorResponse(
      res,
      "Subscription ID and new QR code are required",
      400
    );
  }

  const subscription = await Subscription.findOne({
    _id:          subscriptionId,
    supervisorId: req.user._id,
    isDeleted:    false,
  });

  if (!subscription) {
    return errorResponse(res, "Subscription not found", 404);
  }

  const oldQrCode = subscription.qrCode;

  // Mark old QR as damaged
  if (oldQrCode) {
    await QRStock.findOneAndUpdate(
      { qrCode: oldQrCode },
      { $set: { status: reason?.includes("lost") ? "lost" : "damaged" } }
    );
  }

  // Assign new QR
  await Subscription.findByIdAndUpdate(subscriptionId, {
    $set: {
      qrCode:        newQrCode,
      qrAllocatedAt: new Date(),
    },
  });

  await Vehicle.findByIdAndUpdate(subscription.vehicleId, {
    $set: {
      qrCode:            newQrCode,
      qrCodeAllocatedAt: new Date(),
    },
  });

  return successResponse(
    res,
    "QR code reassigned successfully",
    {
      subscriptionId,
      oldQrCode,
      newQrCode,
      reason: reason || "Not specified",
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/supervisor/onboarding/list
// @desc    Get onboarding history per apartment
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const getOnboardingList = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find({
    supervisorId: req.user._id,
    isDeleted:    false,
  })
    .populate("customerId",  "name mobileNo")
    .populate("vehicleId",   "registrationNo brand model")
    .populate("apartmentId", "name address")
    .sort({ createdAt: -1 });

  return successResponse(
    res,
    "Onboarding list fetched successfully",
    {
      count: subscriptions.length,
      subscriptions,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/supervisor/cleaners
// @desc    Add cleaner under this supervisor
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const addCleaner = asyncHandler(async (req, res) => {
  const { cleanerId, cleanerType } = req.body || {};

  if (!cleanerId) {
    return errorResponse(res, "Cleaner ID is required", 400);
  }

  // Check cleaner exists and has CL role
  const cleaner = await User.findOne({
    _id:       cleanerId,
    role:      ROLES.CAR_CLEANER,
    status:    "active",
    isDeleted: false,
  });

  if (!cleaner) {
    return errorResponse(
      res,
      "Cleaner not found or not active",
      404
    );
  }

  // Check capacity
  const assignedCount = await Subscription.countDocuments({
    cleanerId,
    status:    "active",
    isDeleted: false,
  });

  const maxCars = cleanerType === "part_time"
    ? CLEANER_CAPACITY.PART_TIME_MAX_CARS
    : CLEANER_CAPACITY.FULL_TIME_MAX_CARS;

  const alertAt = cleanerType === "part_time"
    ? CLEANER_CAPACITY.PART_TIME_ALERT_AT
    : CLEANER_CAPACITY.FULL_TIME_ALERT_AT;

  const isNearCapacity = assignedCount >= alertAt;
  const isAtCapacity   = assignedCount >= maxCars;

  if (isAtCapacity) {
    return errorResponse(
      res,
      `Cleaner is at full capacity (${maxCars} cars). Cannot add more.`,
      400
    );
  }

  return successResponse(
    res,
    "Cleaner verified successfully",
    {
      cleaner: {
        _id:          cleaner._id,
        name:         cleaner.name,
        partnerId:    cleaner.partnerId,
        assignedCars: assignedCount,
        maxCars,
        isNearCapacity,
        alertMessage: isNearCapacity
          ? `Alert: Cleaner has ${assignedCount} cars assigned. Approaching capacity of ${maxCars}.`
          : null,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/supervisor/cleaners
// @desc    Get all cleaners under this supervisor
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const getCleaners = asyncHandler(async (req, res) => {
  // Get unique cleaner IDs from subscriptions
  const subscriptions = await Subscription.find({
    supervisorId: req.user._id,
    status:       "active",
    isDeleted:    false,
  }).distinct("cleanerId");

  const cleaners = await User.find({
    _id:       { $in: subscriptions },
    role:      ROLES.CAR_CLEANER,
    isDeleted: false,
  }).select("name mobileNo partnerId status profilePic");

  // Add capacity info for each cleaner
  const cleanersWithCapacity = await Promise.all(
    cleaners.map(async (cleaner) => {
      const assignedCount = await Subscription.countDocuments({
        cleanerId: cleaner._id,
        status:    "active",
        isDeleted: false,
      });

      return {
        _id:          cleaner._id,
        name:         cleaner.name,
        mobileNo:     cleaner.mobileNo,
        partnerId:    cleaner.partnerId,
        status:       cleaner.status,
        profilePic:   cleaner.profilePic,
        assignedCars: assignedCount,
        maxCars:      30,
        liveLoad:     `${assignedCount}/30`,
      };
    })
  );

  return successResponse(
    res,
    "Cleaners fetched successfully",
    {
      count:    cleanersWithCapacity.length,
      cleaners: cleanersWithCapacity,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/supervisor/subscriptions/:id/assign-cleaner
// @desc    Assign cleaner to a subscription
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const assignCleaner = asyncHandler(async (req, res) => {
  const { cleanerId } = req.body || {};

  if (!cleanerId) {
    return errorResponse(res, "Cleaner ID is required", 400);
  }

  const subscription = await Subscription.findOne({
    _id:          req.params.id,
    supervisorId: req.user._id,
    isDeleted:    false,
  });

  if (!subscription) {
    return errorResponse(res, "Subscription not found", 404);
  }

  // Verify cleaner
  const cleaner = await User.findOne({
    _id:       cleanerId,
    role:      ROLES.CAR_CLEANER,
    status:    "active",
    isDeleted: false,
  });

  if (!cleaner) {
    return errorResponse(
      res,
      "Cleaner not found or not active",
      404
    );
  }

  await Subscription.findByIdAndUpdate(
    req.params.id,
    { $set: { cleanerId } }
  );

  return successResponse(
    res,
    "Cleaner assigned successfully",
    {
      subscriptionId: req.params.id,
      cleanerId,
      cleanerName:    cleaner.name,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/supervisor/work/schedule
// @desc    Apartment wise daily work schedule
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const getWorkSchedule = asyncHandler(async (req, res) => {
  const { date } = req.query;

  const queryDate = date ? new Date(date) : new Date();
  queryDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(queryDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const sessions = await WorkSession.find({
    supervisorId: req.user._id,
    workDate:     { $gte: queryDate, $lt: nextDay },
    isDeleted:    false,
  })
    .populate("cleanerId",  "name mobileNo partnerId")
    .populate("customerId", "name mobileNo")
    .populate("vehicleId",  "registrationNo brand")
    .sort({ createdAt: 1 });

  const assigned  = sessions.length;
  const done      = sessions.filter(
    (s) => ["completed", "approved"].includes(s.status)
  ).length;

  return successResponse(
    res,
    "Work schedule fetched successfully",
    {
      date:     queryDate,
      assigned,
      done,
      completionPercent: assigned > 0
        ? Math.round((done / assigned) * 100)
        : 0,
      sessions,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/supervisor/work/approval-queue
// @desc    Get completed sessions waiting for approval
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const getApprovalQueue = asyncHandler(async (req, res) => {
  const sessions = await WorkSession.find({
    supervisorId: req.user._id,
    status:       "completed",
    isDeleted:    false,
  })
    .populate("cleanerId",  "name mobileNo partnerId profilePic")
    .populate("customerId", "name mobileNo")
    .populate("vehicleId",  "registrationNo brand model")
    .sort({ createdAt: -1 });

  return successResponse(
    res,
    "Approval queue fetched successfully",
    {
      count:    sessions.length,
      sessions,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/supervisor/work/:sessionId/approve
// @desc    Approve cleaner work session
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const approveWork = asyncHandler(async (req, res) => {
  const session = await WorkSession.findOne({
    _id:          req.params.sessionId,
    supervisorId: req.user._id,
    isDeleted:    false,
  });

  if (!session) {
    return errorResponse(res, "Session not found", 404);
  }

  if (session.status !== "completed") {
    return errorResponse(
      res,
      `Cannot approve session with status: ${session.status}`,
      400
    );
  }

  await WorkSession.findByIdAndUpdate(session._id, {
    $set: {
      status:          "approved",
      approvedBy:      req.user._id,
      approvedAt:      new Date(),
      countsForPayout: true,
    },
  });

  return successResponse(
    res,
    "Work approved successfully. Counts toward cleaner payout.",
    { sessionId: session._id }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/supervisor/work/:sessionId/redo
// @desc    Mark work for redo
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const redoWork = asyncHandler(async (req, res) => {
  const { reason } = req.body || {};

  const session = await WorkSession.findOne({
    _id:          req.params.sessionId,
    supervisorId: req.user._id,
    isDeleted:    false,
  });

  if (!session) {
    return errorResponse(res, "Session not found", 404);
  }

  await WorkSession.findByIdAndUpdate(session._id, {
    $set: {
      status:          "redo",
      rejectionReason: reason || "Work quality not satisfactory",
    },
  });

  return successResponse(
    res,
    "Work marked for redo. Cleaner notified.",
    {
      sessionId: session._id,
      reason:    reason || "Work quality not satisfactory",
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/supervisor/work/:sessionId/reject
// @desc    Reject cleaner work session
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const rejectWork = asyncHandler(async (req, res) => {
  const { reason } = req.body || {};

  const session = await WorkSession.findOne({
    _id:          req.params.sessionId,
    supervisorId: req.user._id,
    isDeleted:    false,
  });

  if (!session) {
    return errorResponse(res, "Session not found", 404);
  }

  await WorkSession.findByIdAndUpdate(session._id, {
    $set: {
      status:          "rejected_by_supervisor",
      rejectionReason: reason || "Work not acceptable",
      countsForPayout: false,
    },
  });

  return successResponse(
    res,
    "Work rejected. Does not count toward payout.",
    { sessionId: session._id }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/supervisor/customer-rejections
// @desc    Get cleanings rejected by customers
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const getCustomerRejections = asyncHandler(async (req, res) => {
  const rejections = await WorkSession.find({
    supervisorId: req.user._id,
    status:       "rejected_by_customer",
    isDeleted:    false,
  })
    .populate("cleanerId",  "name mobileNo")
    .populate("customerId", "name mobileNo")
    .populate("vehicleId",  "registrationNo")
    .sort({ updatedAt: -1 });

  return successResponse(
    res,
    "Customer rejections fetched successfully",
    {
      count:      rejections.length,
      rejections,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/supervisor/customer-rejections/:id/action
// @desc    Take action on customer rejection
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const actionOnRejection = asyncHandler(async (req, res) => {
  const { action, remark } = req.body || {};
  // action = "ACCEPT" | "REDO" | "FOLLOW_UP"

  if (!action) {
    return errorResponse(res, "Action is required", 400);
  }

  const session = await WorkSession.findOne({
    _id:          req.params.id,
    supervisorId: req.user._id,
    isDeleted:    false,
  });

  if (!session) {
    return errorResponse(res, "Session not found", 404);
  }

  let newStatus;
  if (action === "ACCEPT") {
    newStatus = "approved";
  } else if (action === "REDO") {
    newStatus = "redo";
  } else {
    newStatus = "rejected_by_customer";
  }

  await WorkSession.findByIdAndUpdate(session._id, {
    $set: {
      status:          newStatus,
      rejectionReason: remark || action,
    },
  });

  return successResponse(
    res,
    `Action ${action} taken successfully`,
    { sessionId: session._id, action, remark }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/supervisor/qr-stock
// @desc    Get QR stock details
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const getQRStock = asyncHandler(async (req, res) => {
  const stock = await QRStock.find({
    supervisorId: req.user._id,
    isDeleted:    false,
  });

  const total     = stock.length;
  const available = stock.filter(
    (q) => q.status === "available"
  ).length;
  const allocated = stock.filter(
    (q) => q.status === "allocated"
  ).length;
  const damaged   = stock.filter(
    (q) => q.status === "damaged"
  ).length;

  return successResponse(
    res,
    "QR stock fetched successfully",
    {
      summary: {
        total,
        available,
        allocated,
        damaged,
        balance: available,
      },
      stock,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/supervisor/qr-stock/request
// @desc    Request new QR batch from admin
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const requestQRBatch = asyncHandler(async (req, res) => {
  const { quantity, reason } = req.body || {};

  if (!quantity || quantity < 1) {
    return errorResponse(res, "Quantity is required", 400);
  }

  // For now logging request
  // Admin module will process this in Phase 12
  return successResponse(
    res,
    "QR batch request submitted successfully",
    {
      supervisorId: req.user._id,
      quantity,
      reason:       reason || "Stock running low",
      status:       "pending",
      message:      "Admin will process and allocate QR codes shortly",
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/supervisor/inventory
// @desc    Get inventory received by supervisor
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const getSupervisorInventory = asyncHandler(async (req, res) => {
  const inventory = await Inventory.find({
    supervisorId: req.user._id,
    isDeleted:    false,
  })
    .populate("cleanerId", "name mobileNo partnerId")
    .sort({ allocatedAt: -1 });

  const received  = inventory.length;
  const accepted  = inventory.filter(
    (i) => i.status === "accepted"
  ).length;
  const allocated = inventory.filter(
    (i) => i.cleanerId
  ).length;

  return successResponse(
    res,
    "Inventory fetched successfully",
    {
      summary: {
        received,
        accepted,
        allocated,
        balance: accepted - allocated,
      },
      inventory,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/supervisor/inventory/allocate
// @desc    Allocate inventory item to cleaner
// @access  Private (SU role)
// ─────────────────────────────────────────────────────────
const allocateInventory = asyncHandler(async (req, res) => {
  const {
    cleanerId,
    itemName,
    quantity,
    unit,
  } = req.body || {};

  if (!cleanerId || !itemName || !quantity) {
    return errorResponse(
      res,
      "Cleaner ID, item name and quantity are required",
      400
    );
  }

  // Verify cleaner is under this supervisor
  const cleanerSub = await Subscription.findOne({
    supervisorId: req.user._id,
    cleanerId,
    status:       "active",
    isDeleted:    false,
  });

  if (!cleanerSub) {
    return errorResponse(
      res,
      "Cleaner not found under your supervision",
      404
    );
  }

  const item = await Inventory.create({
    cleanerId,
    supervisorId: req.user._id,
    itemName,
    quantity,
    unit:         unit || "piece",
    status:       "pending",
    allocatedAt:  new Date(),
  });

  return createdResponse(
    res,
    "Inventory allocated to cleaner successfully",
    { item }
  );
});

module.exports = {
  getSupervisorHome,
  getOnboardingQueue,
  onboardQRScan,
  reassignQR,
  getOnboardingList,
  addCleaner,
  getCleaners,
  assignCleaner,
  getWorkSchedule,
  getApprovalQueue,
  approveWork,
  redoWork,
  rejectWork,
  getCustomerRejections,
  actionOnRejection,
  getQRStock,
  requestQRBatch,
  getSupervisorInventory,
  allocateInventory,
};