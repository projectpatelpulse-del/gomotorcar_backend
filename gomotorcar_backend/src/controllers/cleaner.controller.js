const WorkSession  = require("../models/workSession.model");
const Earnings     = require("../models/earnings.model");
const Inventory    = require("../models/inventory.model");
const Grievance    = require("../models/grievance.model");
const Subscription = require("../models/subscription.model");
const Apartment    = require("../models/apartment.model");
const User         = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");

// ─────────────────────────────────────────────────────────
// @route   GET /api/cleaner/home
// @desc    Cleaner home dashboard
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const getCleanerHome = asyncHandler(async (req, res) => {
  const cleanerId = req.user._id;
  const today     = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow  = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's sessions
  const todaySessions = await WorkSession.find({
    cleanerId,
    workDate:  { $gte: today, $lt: tomorrow },
    isDeleted: false,
  });

  const assigned  = todaySessions.length;
  const completed = todaySessions.filter(
    (s) => ["completed", "approved"].includes(s.status)
  ).length;

  // Get first and last scan times
  const sortedSessions = todaySessions
    .filter((s) => s.startTime)
    .sort((a, b) => a.startTime - b.startTime);

  const firstScan = sortedSessions[0]?.startTime || null;
  const lastScan  = sortedSessions[
    sortedSessions.length - 1
  ]?.startTime || null;

  // Get allocated apartments count
  const subscriptions = await Subscription.find({
    cleanerId,
    status:    "active",
    isDeleted: false,
  }).distinct("apartmentId");

  // Get unique customers
  const customers = await Subscription.find({
    cleanerId,
    status:    "active",
    isDeleted: false,
  }).distinct("customerId");

  // Get supervisors
  const supervisors = await Subscription.find({
    cleanerId,
    status:    "active",
    isDeleted: false,
  }).distinct("supervisorId");

  return successResponse(
    res,
    "Cleaner home fetched successfully",
    {
      home: {
        name:            req.user.name,
        partnerId:       req.user.partnerId,
        role:            "Car Cleaner",
        apartmentsCount: subscriptions.length,
        customersCount:  customers.length,
        supervisorsCount:supervisors.filter(Boolean).length,
        todayWork: {
          assigned,
          completed,
          completionPercent: assigned > 0
            ? Math.round((completed / assigned) * 100)
            : 0,
          workStartTime: firstScan,
          lastScanTime:  lastScan,
        },
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/cleaner/apartments
// @desc    Get allocated apartments
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const getCleanerApartments = asyncHandler(async (req, res) => {
  // Get active subscriptions for this cleaner
  const subscriptions = await Subscription.find({
    cleanerId: req.user._id,
    status:    "active",
    isDeleted: false,
  })
    .populate("apartmentId", "name address society geoFenceRadius")
    .populate("customerId",  "name mobileNo")
    .populate("vehicleId",   "registrationNo brand model");

  // Group by apartment
  const apartmentMap = {};

  subscriptions.forEach((sub) => {
    const aptId = sub.apartmentId?._id?.toString();
    if (!aptId) return;

    if (!apartmentMap[aptId]) {
      apartmentMap[aptId] = {
        apartment: sub.apartmentId,
        customers: [],
        carCount:  0,
      };
    }

    apartmentMap[aptId].customers.push({
      customer: sub.customerId,
      vehicle:  sub.vehicleId,
      qrCode:   sub.qrCode,
    });

    apartmentMap[aptId].carCount++;
  });

  const apartments = Object.values(apartmentMap);

  return successResponse(
    res,
    "Apartments fetched successfully",
    {
      count:      apartments.length,
      apartments,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/cleaner/work/schedule
// @desc    Get daily work schedule
// @access  Private (CL role)
// Query: date
// ─────────────────────────────────────────────────────────
const getWorkSchedule = asyncHandler(async (req, res) => {
  const { date } = req.query;

  const queryDate  = date ? new Date(date) : new Date();
  queryDate.setHours(0, 0, 0, 0);
  const nextDay    = new Date(queryDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // Get active subscriptions
  const subscriptions = await Subscription.find({
    cleanerId: req.user._id,
    status:    "active",
    isDeleted: false,
  })
    .populate("customerId",  "name mobileNo profilePic")
    .populate("vehicleId",   "registrationNo brand model color")
    .populate("apartmentId", "name address");

  // Get today's sessions for status
  const sessions = await WorkSession.find({
    cleanerId:  req.user._id,
    workDate:   { $gte: queryDate, $lt: nextDay },
    isDeleted:  false,
  });

  // Map sessions to subscriptions
  const schedule = subscriptions.map((sub) => {
    const session = sessions.find(
      (s) => s.subscriptionId.toString() ===
        sub._id.toString()
    );

    return {
      subscriptionId: sub._id,
      apartment:      sub.apartmentId,
      customer:       sub.customerId,
      vehicle:        sub.vehicleId,
      qrCode:         sub.qrCode,
      cleaningType:   "external",
      status:         session?.status || "pending",
      sessionId:      session?._id   || null,
      startTime:      session?.startTime || null,
      endTime:        session?.endTime   || null,
    };
  });

  return successResponse(
    res,
    "Work schedule fetched successfully",
    {
      date:  queryDate,
      total: schedule.length,
      done:  schedule.filter(
        (s) => ["completed","approved"].includes(s.status)
      ).length,
      schedule,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/cleaner/work/scan
// @desc    Scan QR code to open work session
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const scanQRCode = asyncHandler(async (req, res) => {
  const {
    qrCode,
    lat,
    lng,
    cleaningType,
  } = req.body;

  if (!qrCode || !lat || !lng) {
    return errorResponse(
      res,
      "QR code and location are required",
      400
    );
  }

  // Find subscription with this QR
  const subscription = await Subscription.findOne({
    qrCode,
    cleanerId: req.user._id,
    status:    "active",
    isDeleted: false,
  })
    .populate("vehicleId",   "registrationNo brand")
    .populate("customerId",  "name mobileNo")
    .populate("apartmentId", "name geoFenceRadius location");

  if (!subscription) {
    return errorResponse(
      res,
      "Invalid QR code or not assigned to you",
      404
    );
  }

  // ─── Geo-fence validation ─────────────────────────────
  // Default true — if no apartment or coordinates not set
  // scan is allowed without geo-fence check
  let isWithinGeoFence = true;

  if (
    subscription.apartmentId &&
    subscription.apartmentId.location &&
    subscription.apartmentId.location.coordinates &&
    subscription.apartmentId.location.coordinates[0] !== 0 &&
    subscription.apartmentId.location.coordinates[1] !== 0
  ) {
    const aptCoords  = subscription.apartmentId.location.coordinates;
    const distance   = calculateDistance(
      parseFloat(lat),
      parseFloat(lng),
      aptCoords[1], // latitude
      aptCoords[0]  // longitude
    );

    const fenceRadius = subscription.apartmentId.geoFenceRadius || 100;
    isWithinGeoFence  = distance * 1000 <= fenceRadius;

    if (!isWithinGeoFence) {
      return errorResponse(
        res,
        `You are ${Math.round(distance * 1000)} meters away from the apartment. Must be within ${fenceRadius} meters to scan.`,
        400
      );
    }
  }

  // ─── Duplicate scan check ─────────────────────────────
  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingSession = await WorkSession.findOne({
    cleanerId:      req.user._id,
    subscriptionId: subscription._id,
    cleaningType:   cleaningType || "external",
    workDate:       { $gte: today, $lt: tomorrow },
    isDeleted:      false,
  });

  if (existingSession) {
    return errorResponse(
      res,
      "Already scanned for this car today",
      409
    );
  }

  // ─── Create work session ──────────────────────────────
const session = await WorkSession.create({
  cleanerId:      req.user._id,
  subscriptionId: subscription._id,
  customerId:     subscription.customerId?._id
                  || subscription.customerId
                  || null,
  vehicleId:      subscription.vehicleId?._id
                  || subscription.vehicleId
                  || null,
  supervisorId:   subscription.supervisorId || null,
  apartmentId:    subscription.apartmentId?._id
                  || null,
  qrCode,
  cleaningType:   cleaningType || "external",
  workDate:       new Date(),
  scanLocation: {
    type:        "Point",
    coordinates: [parseFloat(lng), parseFloat(lat)],
  },
  isWithinGeoFence,
  status: "scanned",
});

  return createdResponse(
    res,
    "QR scanned successfully. Start your work.",
    {
      session: {
        _id:             session._id,
        status:          session.status,
        cleaningType:    session.cleaningType,
        customer:        subscription.customerId,
        vehicle:         subscription.vehicleId,
        isWithinGeoFence,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/cleaner/work/:sessionId/start
// @desc    Mark work start time
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const startWork = asyncHandler(async (req, res) => {
  const session = await WorkSession.findOne({
    _id:       req.params.sessionId,
    cleanerId: req.user._id,
    isDeleted: false,
  });

  if (!session) {
    return errorResponse(res, "Work session not found", 404);
  }

  if (session.status !== "scanned") {
    return errorResponse(
      res,
      `Cannot start work. Session is already ${session.status}`,
      400
    );
  }

  await WorkSession.findByIdAndUpdate(session._id, {
    $set: {
      startTime: new Date(),
      status:    "in_progress",
    },
  });

  return successResponse(
    res,
    "Work started successfully",
    {
      sessionId:  session._id,
      startTime:  new Date(),
      status:     "in_progress",
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/cleaner/work/:sessionId/end
// @desc    Mark work completion
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const endWork = asyncHandler(async (req, res) => {
  const { photoUrl, notes } = req.body;

  const session = await WorkSession.findOne({
    _id:       req.params.sessionId,
    cleanerId: req.user._id,
    isDeleted: false,
  });

  if (!session) {
    return errorResponse(res, "Work session not found", 404);
  }

  if (session.status !== "in_progress") {
    return errorResponse(
      res,
      "Work must be started before ending",
      400
    );
  }

  // Calculate duration
  const endTime  = new Date();
  const duration = session.startTime
    ? Math.round(
        (endTime - session.startTime) / 60000
      )
    : 0;

  await WorkSession.findByIdAndUpdate(session._id, {
    $set: {
      endTime,
      duration,
      photoUrl: photoUrl || null,
      notes:    notes    || null,
      status:   "completed",
    },
  });

  // Update subscription cleaning count
  const updateField =
    session.cleaningType === "external"
      ? "completedExternalCleanings"
      : "completedInternalCleanings";

  await Subscription.findByIdAndUpdate(
    session.subscriptionId,
    { $inc: { [updateField]: 1 } }
  );

  return successResponse(
    res,
    "Work completed successfully. Waiting for supervisor approval.",
    {
      sessionId: session._id,
      endTime,
      duration:  `${duration} minutes`,
      status:    "completed",
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/cleaner/work/offline-sync
// @desc    Sync offline work sessions
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const offlineSync = asyncHandler(async (req, res) => {
  const { sessions } = req.body;
  // sessions = array of buffered work sessions

  if (!sessions || !Array.isArray(sessions)) {
    return errorResponse(
      res,
      "Sessions array is required",
      400
    );
  }

  const accepted = [];
  const rejected = [];

  for (const session of sessions) {
    try {
      // Check if subscription exists and valid
      const subscription = await Subscription.findOne({
        qrCode:    session.qrCode,
        cleanerId: req.user._id,
        status:    "active",
        isDeleted: false,
      });

      if (!subscription) {
        rejected.push({
          ...session,
          reason: "Invalid QR or subscription not found",
        });
        continue;
      }

      // Check for duplicate
      const workDate = new Date(session.workDate);
      workDate.setHours(0, 0, 0, 0);
      const nextDay  = new Date(workDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const duplicate = await WorkSession.findOne({
        cleanerId:      req.user._id,
        subscriptionId: subscription._id,
        cleaningType:   session.cleaningType,
        workDate:       { $gte: workDate, $lt: nextDay },
        isDeleted:      false,
      });

      if (duplicate) {
        rejected.push({
          ...session,
          reason: "Duplicate session for this date",
        });
        continue;
      }

      // Create session
      const created = await WorkSession.create({
        cleanerId:      req.user._id,
        subscriptionId: subscription._id,
        customerId:     subscription.customerId,
        vehicleId:      subscription.vehicleId,
        supervisorId:   subscription.supervisorId,
        qrCode:         session.qrCode,
        cleaningType:   session.cleaningType,
        workDate:       new Date(session.workDate),
        startTime:      session.startTime
          ? new Date(session.startTime)
          : null,
        endTime: session.endTime
          ? new Date(session.endTime)
          : null,
        photoUrl:      session.photoUrl || null,
        status:        "completed",
        isOfflineSync: true,
      });

      accepted.push(created._id);
    } catch (err) {
      rejected.push({
        ...session,
        reason: err.message,
      });
    }
  }

  return successResponse(
    res,
    "Offline sync completed",
    {
      total:    sessions.length,
      accepted: accepted.length,
      rejected: rejected.length,
      acceptedIds: accepted,
      rejectedSessions: rejected,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/cleaner/work/approval-status
// @desc    Get approval status of sessions
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const getApprovalStatus = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const sessions = await WorkSession.find({
    cleanerId: req.user._id,
    isDeleted: false,
  })
    .populate("customerId", "name")
    .populate("vehicleId",  "registrationNo")
    .sort({ createdAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  // Group by status
  const summary = {
    approved:             0,
    redo:                 0,
    rejected_by_customer: 0,
    rejected_by_supervisor: 0,
    completed:            0,
    in_progress:          0,
  };

  sessions.forEach((s) => {
    if (summary[s.status] !== undefined) {
      summary[s.status]++;
    }
  });

  return successResponse(
    res,
    "Approval status fetched successfully",
    {
      summary,
      sessions,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/cleaner/work/assigned-vs-completed
// @desc    Get assigned vs completed stats
// @access  Private (CL role)
// Query: period = daily | weekly | monthly
// ─────────────────────────────────────────────────────────
const getAssignedVsCompleted = asyncHandler(async (req, res) => {
  const { period = "daily" } = req.query;

  const now   = new Date();
  let start;

  if (period === "daily") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    start = new Date(now);
    start.setDate(now.getDate() - 7);
  } else {
    start = new Date(now);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  // Get active subscriptions = assigned
  const assigned = await Subscription.countDocuments({
    cleanerId: req.user._id,
    status:    "active",
    isDeleted: false,
  });

  // Get completed sessions in period
  const completedSessions = await WorkSession.find({
    cleanerId: req.user._id,
    workDate:  { $gte: start, $lte: now },
    status:    { $in: ["completed", "approved"] },
    isDeleted: false,
  });

  const externalDone = completedSessions.filter(
    (s) => s.cleaningType === "external"
  ).length;

  const internalDone = completedSessions.filter(
    (s) => s.cleaningType === "internal"
  ).length;

  return successResponse(
    res,
    "Assigned vs completed fetched successfully",
    {
      period,
      assigned,
      completed: {
        external: externalDone,
        internal: internalDone,
        total:    externalDone + internalDone,
      },
      completionPercent: assigned > 0
        ? Math.round(
            ((externalDone + internalDone) / assigned) * 100
          )
        : 0,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/cleaner/earnings
// @desc    Get earnings summary
// @access  Private (CL role)
// Query: period = daily | weekly | monthly
// ─────────────────────────────────────────────────────────
const getEarnings = asyncHandler(async (req, res) => {
  const { period = "daily" } = req.query;

  const now   = new Date();
  let start;

  if (period === "daily") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    start = new Date(now);
    start.setDate(now.getDate() - 7);
  } else {
    start = new Date(now);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  const earnings = await Earnings.find({
    cleanerId: req.user._id,
    date:      { $gte: start, $lte: now },
    isDeleted: false,
  });

  const externalEarnings = earnings
    .filter((e) => e.earningType === "external_cleaning")
    .reduce((sum, e) => sum + e.amount, 0);

  const internalEarnings = earnings
    .filter((e) => e.earningType === "internal_cleaning")
    .reduce((sum, e) => sum + e.amount, 0);

  const tips = earnings
    .filter((e) => e.earningType === "tip")
    .reduce((sum, e) => sum + e.amount, 0);

  const externalCount = earnings.filter(
    (e) => e.earningType === "external_cleaning"
  ).length;

  const internalCount = earnings.filter(
    (e) => e.earningType === "internal_cleaning"
  ).length;

  return successResponse(
    res,
    "Earnings fetched successfully",
    {
      period,
      earnings: {
        external: {
          count:  externalCount,
          amount: externalEarnings,
        },
        internal: {
          count:  internalCount,
          amount: internalEarnings,
        },
        tips: {
          amount: tips,
        },
        total: externalEarnings + internalEarnings + tips,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/cleaner/earnings/balance
// @desc    Get earning vs payment balance
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const getEarningsBalance = asyncHandler(async (req, res) => {
  // Total earned
  const allEarnings = await Earnings.find({
    cleanerId: req.user._id,
    isDeleted: false,
  });

  const totalEarned = allEarnings.reduce(
    (sum, e) => sum + e.amount, 0
  );

  // Total paid
  const totalPaid = allEarnings
    .filter((e) => e.isPaid)
    .reduce((sum, e) => sum + e.amount, 0);

  const balance = totalEarned - totalPaid;

  // Weekly breakdown
  const now       = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const weeklyEarnings = allEarnings
    .filter((e) => new Date(e.date) >= weekStart)
    .reduce((sum, e) => sum + e.amount, 0);

  // Monthly breakdown
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyEarnings = allEarnings
    .filter((e) => new Date(e.date) >= monthStart)
    .reduce((sum, e) => sum + e.amount, 0);

  return successResponse(
    res,
    "Earnings balance fetched successfully",
    {
      balance: {
        totalEarned,
        totalPaid,
        outstanding: balance,
      },
      breakdown: {
        weekly:  weeklyEarnings,
        monthly: monthlyEarnings,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/cleaner/payments
// @desc    Get salary and tips payment history
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const getPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const earnings = await Earnings.find({
    cleanerId: req.user._id,
    isPaid:    true,
    isDeleted: false,
  })
    .populate("customerId", "name")
    .sort({ paidAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await Earnings.countDocuments({
    cleanerId: req.user._id,
    isPaid:    true,
    isDeleted: false,
  });

  return successResponse(
    res,
    "Payment history fetched successfully",
    {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      payments:   earnings,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/cleaner/ratings
// @desc    Get cleaner performance ratings
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const getCleanerRatings = asyncHandler(async (req, res) => {
  // For now returning from work sessions
  // Full ratings module in Phase 13

  const sessions = await WorkSession.find({
    cleanerId: req.user._id,
    status:    "approved",
    isDeleted: false,
  }).select("workDate cleaningType status createdAt");

  return successResponse(
    res,
    "Ratings fetched successfully",
    {
      totalApproved: sessions.length,
      message:       "Detailed ratings available in Phase 13",
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/cleaner/inventory
// @desc    Get inventory allocated to cleaner
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const getInventory = asyncHandler(async (req, res) => {
  const inventory = await Inventory.find({
    cleanerId: req.user._id,
    isDeleted: false,
  })
    .populate("supervisorId", "name mobileNo")
    .sort({ allocatedAt: -1 });

  return successResponse(
    res,
    "Inventory fetched successfully",
    {
      count: inventory.length,
      inventory,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/cleaner/inventory/:id/accept
// @desc    Accept inventory allocation
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const acceptInventory = asyncHandler(async (req, res) => {
  const item = await Inventory.findOne({
    _id:       req.params.id,
    cleanerId: req.user._id,
    isDeleted: false,
  });

  if (!item) {
    return errorResponse(res, "Inventory item not found", 404);
  }

  if (item.status !== "pending") {
    return errorResponse(
      res,
      `Item already ${item.status}`,
      400
    );
  }

  await Inventory.findByIdAndUpdate(item._id, {
    $set: {
      status:     "accepted",
      acceptedAt: new Date(),
    },
  });

  return successResponse(res, "Inventory accepted successfully");
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/cleaner/inventory/:id/reject
// @desc    Reject inventory allocation
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const rejectInventory = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const item = await Inventory.findOne({
    _id:       req.params.id,
    cleanerId: req.user._id,
    isDeleted: false,
  });

  if (!item) {
    return errorResponse(res, "Inventory item not found", 404);
  }

  await Inventory.findByIdAndUpdate(item._id, {
    $set: {
      status:          "rejected",
      rejectionReason: reason || "Rejected by cleaner",
    },
  });

  return successResponse(res, "Inventory rejected");
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/cleaner/cautions
// @desc    Get cautions/warnings issued
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const getCautions = asyncHandler(async (req, res) => {
  // Cautions come from rejected sessions
  const rejectedSessions = await WorkSession.find({
    cleanerId: req.user._id,
    status:    "rejected_by_supervisor",
    isDeleted: false,
  })
    .populate("supervisorId", "name")
    .sort({ updatedAt: -1 });

  return successResponse(
    res,
    "Cautions fetched successfully",
    {
      count:    rejectedSessions.length,
      cautions: rejectedSessions.map((s) => ({
        sessionId: s._id,
        date:      s.workDate,
        reason:    s.rejectionReason,
        supervisor: s.supervisorId,
      })),
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/cleaner/grievances
// @desc    Raise a grievance
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const raiseGrievance = asyncHandler(async (req, res) => {
  const {
    type,
    subject,
    description,
    photos,
    refId,
    refModel,
  } = req.body;

  const grievance = await Grievance.create({
    raisedBy:     req.user._id,
    raisedByRole: req.user.role,
    type,
    subject,
    description,
    photos:   photos   || [],
    refId:    refId    || null,
    refModel: refModel || null,
    messages: [{
      senderId:   req.user._id,
      senderRole: req.user.role,
      message:    description,
      sentAt:     new Date(),
    }],
  });

  return createdResponse(
    res,
    "Grievance raised successfully",
    {
      grievance: {
        _id:      grievance._id,
        ticketNo: grievance.ticketNo,
        status:   grievance.status,
        type:     grievance.type,
        subject:  grievance.subject,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/cleaner/grievances
// @desc    Get all grievances raised by cleaner
// @access  Private (CL role)
// ─────────────────────────────────────────────────────────
const getGrievances = asyncHandler(async (req, res) => {
  const grievances = await Grievance.find({
    raisedBy:  req.user._id,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  return successResponse(
    res,
    "Grievances fetched successfully",
    {
      count: grievances.length,
      grievances,
    }
  );
});

// ─────────────────────────────────────────────────────────
// HELPER: Calculate distance in km
// ─────────────────────────────────────────────────────────
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R    = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a    =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  return 6371 * 2 * Math.atan2(
    Math.sqrt(a), Math.sqrt(1 - a)
  );
};

const toRad = (v) => (v * Math.PI) / 180;

module.exports = {
  getCleanerHome,
  getCleanerApartments,
  getWorkSchedule,
  scanQRCode,
  startWork,
  endWork,
  offlineSync,
  getApprovalStatus,
  getAssignedVsCompleted,
  getEarnings,
  getEarningsBalance,
  getPayments,
  getCleanerRatings,
  getInventory,
  acceptInventory,
  rejectInventory,
  getCautions,
  raiseGrievance,
  getGrievances,
};