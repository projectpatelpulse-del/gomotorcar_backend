const User              = require("../models/user.model");
const Booking           = require("../models/booking.model");
const Grievance         = require("../models/grievance.model");
const FranchiseeProfile = require("../models/franchiseeProfile.model");
const NCSPProfile       = require("../models/ncspProfile.model");
const Subscription      = require("../models/subscription.model");
const asyncHandler      = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");
const bcrypt = require("bcryptjs");

// ═══════════════════════════════════════════════════════════
// 1. TEAM SUMMARY
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/ops/team/summary
// @desc    Get all onboarded partners summary
// @access  Private (OT role)
// ─────────────────────────────────────────────────────────
const getTeamSummary = asyncHandler(async (req, res) => {
  const [
    // Franchise counts
    totalFranchiseCSP,
    activeFranchiseCSP,
    totalFranchiseSteam,
    activeFranchiseSteam,
    // NCSP counts
    totalNCSP,
    activeNCSP,
    // Supervisor counts
    totalSupervisors,
    activeSupervisors,
    // Cleaner counts
    totalCleaners,
    activeCleaners,
    // Recent onboarded
    recentPartners,
  ] = await Promise.all([
    User.countDocuments({ role: "FR", isDeleted: false }),
    User.countDocuments({ role: "FR", status: "active", isDeleted: false }),
    User.countDocuments({ role: "FS", isDeleted: false }),
    User.countDocuments({ role: "FS", status: "active", isDeleted: false }),
    User.countDocuments({ role: "NC", isDeleted: false }),
    User.countDocuments({ role: "NC", status: "active", isDeleted: false }),
    User.countDocuments({ role: "SU", isDeleted: false }),
    User.countDocuments({ role: "SU", status: "active", isDeleted: false }),
    User.countDocuments({ role: "CL", isDeleted: false }),
    User.countDocuments({ role: "CL", status: "active", isDeleted: false }),
    User.find({
      role:      { $in: ["FR", "FS", "NC", "SU", "CL"] },
      isDeleted: false,
    })
      .select("name role status partnerId createdAt")
      .sort({ createdAt: -1 })
      .limit(10),
  ]);

  return successResponse(
    res,
    "Team summary fetched successfully",
    {
      summary: {
        franchise: {
          csp: {
            total:  totalFranchiseCSP,
            active: activeFranchiseCSP,
            inactive: totalFranchiseCSP - activeFranchiseCSP,
          },
          steam: {
            total:  totalFranchiseSteam,
            active: activeFranchiseSteam,
            inactive: totalFranchiseSteam - activeFranchiseSteam,
          },
        },
        ncsp: {
          total:    totalNCSP,
          active:   activeNCSP,
          inactive: totalNCSP - activeNCSP,
        },
        supervisors: {
          total:    totalSupervisors,
          active:   activeSupervisors,
          inactive: totalSupervisors - activeSupervisors,
        },
        cleaners: {
          total:    totalCleaners,
          active:   activeCleaners,
          inactive: totalCleaners - activeCleaners,
        },
      },
      recentPartners,
    }
  );
});

// ═══════════════════════════════════════════════════════════
// 2. ONBOARDING
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   POST /api/ops/onboarding/franchise
// @desc    Onboard CSP or Steam franchise on behalf
// @access  Private (OT role)
// ─────────────────────────────────────────────────────────
const onboardFranchise = asyncHandler(async (req, res) => {
  const {
    mobileNo, name,
    franchiseType, // "csp" or "steam_wash"
    businessName, ownerName,
    gstNo, businessAddress,
    latitude, longitude,
    services, workingHours,
    workingDays, weeklyOff,
  } = req.body || {};

  if (!mobileNo || !name || !franchiseType) {
    return errorResponse(
      res,
      "Mobile, name and franchise type are required",
      400
    );
  }

  // Check if already registered
  const existing = await User.findOne({
    mobileNo,
    isDeleted: false,
  });

  if (existing) {
    return errorResponse(
      res,
      "Mobile number already registered",
      409
    );
  }

  // Generate partner ID
  const role     = franchiseType === "steam_wash" ? "FS" : "FR";
  const count    = await User.countDocuments({ role });
  const partnerId = `${role}-${String(count + 1).padStart(5, "0")}`;

  // Create user
  const user = await User.create({
    mobileNo,
    name,
    role,
    partnerId,
    status:      "active",
    createdBy:   req.user._id,
    approvedBy:  req.user._id,
    approvedAt:  new Date(),
    activatedAt: new Date(),
  });

  // Create profile
  await FranchiseeProfile.create({
    userId:        user._id,
    businessName:  businessName  || "",
    ownerName:     ownerName     || "",
    franchiseType: franchiseType || "csp",
    gstNo:         gstNo         || "",
    businessAddress,
    location: {
      type:        "Point",
      coordinates: [
        parseFloat(longitude) || 0,
        parseFloat(latitude)  || 0,
      ],
    },
    services:     services     || [],
    workingHours: workingHours || {},
    workingDays:  workingDays  || [],
    weeklyOff:    weeklyOff    || [],
    appStatus:    "active",
    isFormComplete: true,
  });

  return createdResponse(
    res,
    "Franchise onboarded successfully",
    {
      user: {
        _id:       user._id,
        mobileNo:  user.mobileNo,
        name:      user.name,
        role:      user.role,
        partnerId: user.partnerId,
        status:    user.status,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/ops/onboarding/ncsp
// @desc    Onboard NCSP manually with GST verification
// @access  Private (OT role)
// ─────────────────────────────────────────────────────────
const onboardNCSP = asyncHandler(async (req, res) => {
  const {
    mobileNo, name,
    businessName, ownerName,
    gstNo, businessAddress,
    latitude, longitude,
    services, workingHours,
  } = req.body || {};

  if (!mobileNo || !name) {
    return errorResponse(
      res,
      "Mobile and name are required",
      400
    );
  }

  // Check if already registered
  const existing = await User.findOne({
    mobileNo,
    isDeleted: false,
  });

  if (existing) {
    return errorResponse(
      res,
      "Mobile number already registered",
      409
    );
  }

  // Generate partner ID
  const count     = await User.countDocuments({ role: "NC" });
  const partnerId = `NC-${String(count + 1).padStart(5, "0")}`;

  // Create user
  const user = await User.create({
    mobileNo,
    name,
    role:        "NC",
    partnerId,
    status:      "active",
    createdBy:   req.user._id,
    approvedBy:  req.user._id,
    approvedAt:  new Date(),
    activatedAt: new Date(),
  });

  // Create NCSP profile
  await NCSPProfile.create({
    userId:       user._id,
    businessName: businessName || "",
    ownerName:    ownerName    || "",
    gstNo:        gstNo        || "",
    businessAddress,
    location: {
      type:        "Point",
      coordinates: [
        parseFloat(longitude) || 0,
        parseFloat(latitude)  || 0,
      ],
    },
    services:     services     || [],
    workingHours: workingHours || {},
    appStatus:    "active",
    isFormComplete: true,
  });

  return createdResponse(
    res,
    "NCSP onboarded successfully",
    {
      user: {
        _id:       user._id,
        mobileNo:  user.mobileNo,
        name:      user.name,
        role:      user.role,
        partnerId: user.partnerId,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/ops/onboarding/supervisor
// @desc    Add supervisor with apartments
// @access  Private (OT role)
// ─────────────────────────────────────────────────────────
const onboardSupervisor = asyncHandler(async (req, res) => {
  const {
    mobileNo, name, email,
    password, apartments,
  } = req.body || {};

  if (!mobileNo || !name || !password) {
    return errorResponse(
      res,
      "Mobile, name and password are required",
      400
    );
  }

  // Check if already registered
  const existing = await User.findOne({
    mobileNo,
    isDeleted: false,
  });

  if (existing) {
    return errorResponse(
      res,
      "Mobile number already registered",
      409
    );
  }

  // Generate partner ID
  const count     = await User.countDocuments({ role: "SU" });
  const partnerId = `SU-${String(count + 1).padStart(5, "0")}`;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    mobileNo,
    name,
    email,
    role:        "SU",
    partnerId,
    password:    hashedPassword,
    status:      "active",
    createdBy:   req.user._id,
    approvedBy:  req.user._id,
    approvedAt:  new Date(),
    activatedAt: new Date(),
  });

  return createdResponse(
    res,
    "Supervisor onboarded successfully",
    {
      user: {
        _id:        user._id,
        mobileNo:   user.mobileNo,
        name:       user.name,
        partnerId:  user.partnerId,
        apartments: apartments || [],
      },
    }
  );
});

// ═══════════════════════════════════════════════════════════
// 3. BOOKINGS
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/ops/bookings
// @desc    Get active and historical bookings
// @access  Private (OT role)
// ─────────────────────────────────────────────────────────
const getBookings = asyncHandler(async (req, res) => {
  const {
    status, franchiseId, date,
    page = 1, limit = 10,
  } = req.query;

  const filter = { isDeleted: false };
  if (status)      filter.status      = status;
  if (franchiseId) filter.franchiseId = franchiseId;
  if (date) {
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);
    const nextDay   = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.scheduledDate = { $gte: queryDate, $lt: nextDay };
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("customerId",  "name mobileNo")
      .populate("franchiseId", "name mobileNo")
      .populate("serviceId",   "name")
      .populate("vehicleId",   "registrationNo brand")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Booking.countDocuments(filter),
  ]);

  // Quick summary
  const [
    activeCount,
    completedCount,
    cancelledCount,
  ] = await Promise.all([
    Booking.countDocuments({
      status:    { $in: ["pending", "confirmed", "assigned", "in_transit", "started"] },
      isDeleted: false,
    }),
    Booking.countDocuments({ status: "completed", isDeleted: false }),
    Booking.countDocuments({ status: "cancelled", isDeleted: false }),
  ]);

  return successResponse(
    res,
    "Bookings fetched successfully",
    {
      summary: {
        active:    activeCount,
        completed: completedCount,
        cancelled: cancelledCount,
      },
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      bookings,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/ops/bookings/:id/expedite
// @desc    Expedite a booking — notify franchise + flag admin
// @access  Private (OT role)
// ─────────────────────────────────────────────────────────
const expediteBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body || {};

  const booking = await Booking.findOne({
    _id:       req.params.id,
    isDeleted: false,
  }).populate("franchiseId", "name mobileNo");

  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  // Cannot expedite completed or cancelled
  if (["completed", "cancelled"].includes(booking.status)) {
    return errorResponse(
      res,
      `Cannot expedite booking with status: ${booking.status}`,
      400
    );
  }

  // Mark as expedited in booking
  await Booking.findByIdAndUpdate(booking._id, {
    $set: {
      isExpedited:   true,
      expeditedAt:   new Date(),
      expeditedBy:   req.user._id,
      expediteReason:reason || "Operations team escalation",
    },
  });

  return successResponse(
    res,
    "Booking expedited successfully. Franchise notified and admin dashboard flagged.",
    {
      bookingId:   booking._id,
      bookingNo:   booking.bookingNo,
      franchise:   booking.franchiseId?.name,
      status:      booking.status,
      expeditedAt: new Date(),
      reason:      reason || "Operations team escalation",
    }
  );
});

// ═══════════════════════════════════════════════════════════
// 4. GRIEVANCES
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/ops/grievances
// @desc    Unified grievance feed from all sources
// @access  Private (OT role)
// ─────────────────────────────────────────────────────────
const getGrievances = asyncHandler(async (req, res) => {
  const {
    source, // customer | franchise | cleaner
    status,
    page = 1, limit = 10,
  } = req.query;

  const filter = { isDeleted: false };
  if (status) filter.status = status;

  // Filter by source role
  if (source) {
    const roleMap = {
      customer:  "CU",
      franchise: "FR",
      cleaner:   "CL",
      ncsp:      "NC",
    };
    if (roleMap[source]) {
      filter.raisedByRole = roleMap[source];
    }
  }

  const [grievances, total] = await Promise.all([
    Grievance.find(filter)
      .populate("raisedBy",  "name mobileNo role partnerId")
      .populate("resolvedBy","name")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Grievance.countDocuments(filter),
  ]);

  // Status summary
  const [open, inProgress, resolved, escalated] = await Promise.all([
    Grievance.countDocuments({ status: "open",        isDeleted: false }),
    Grievance.countDocuments({ status: "in_progress", isDeleted: false }),
    Grievance.countDocuments({ status: "resolved",    isDeleted: false }),
    Grievance.countDocuments({ status: "escalated",   isDeleted: false }),
  ]);

  return successResponse(
    res,
    "Grievances fetched successfully",
    {
      summary: { open, inProgress, resolved, escalated },
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      grievances,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/ops/grievances/:id/resolve
// @desc    Resolve grievance
// @access  Private (OT role)
// ─────────────────────────────────────────────────────────
const resolveGrievance = asyncHandler(async (req, res) => {
  const { resolution, refundAmount } = req.body || {};

  if (!resolution) {
    return errorResponse(res, "Resolution text is required", 400);
  }

  const grievance = await Grievance.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        status:       "resolved",
        resolution,
        resolvedBy:   req.user._id,
        resolvedAt:   new Date(),
      },
      $push: {
        messages: {
          senderId:   req.user._id,
          senderRole: "OT",
          message:    `Resolved: ${resolution}${
            refundAmount
              ? `. Refund of ₹${refundAmount} initiated.`
              : ""
          }`,
          sentAt: new Date(),
        },
      },
    },
    { new: true }
  ).populate("raisedBy", "name mobileNo");

  if (!grievance) {
    return errorResponse(res, "Grievance not found", 404);
  }

  return successResponse(
    res,
    "Grievance resolved successfully",
    {
      grievance: {
        _id:          grievance._id,
        ticketNo:     grievance.ticketNo,
        status:       grievance.status,
        resolution,
        refundAmount: refundAmount || 0,
        resolvedAt:   new Date(),
        raisedBy:     grievance.raisedBy,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/ops/grievances/:id/escalate
// @desc    Escalate grievance to Admin
// @access  Private (OT role)
// ─────────────────────────────────────────────────────────
const escalateGrievance = asyncHandler(async (req, res) => {
  const { reason } = req.body || {};

  const grievance = await Grievance.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        status:      "escalated",
        isEscalated: true,
        escalatedAt: new Date(),
      },
      $push: {
        messages: {
          senderId:   req.user._id,
          senderRole: "OT",
          message:    `Escalated to Admin. Reason: ${
            reason || "Requires admin attention"
          }`,
          sentAt: new Date(),
        },
      },
    },
    { new: true }
  );

  if (!grievance) {
    return errorResponse(res, "Grievance not found", 404);
  }

  return successResponse(
    res,
    "Grievance escalated to Admin successfully",
    {
      ticketNo:    grievance.ticketNo,
      status:      grievance.status,
      escalatedAt: new Date(),
      reason:      reason || "Requires admin attention",
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/ops/grievances/:id/message
// @desc    Add message to grievance thread
// @access  Private (OT role)
// ─────────────────────────────────────────────────────────
const addGrievanceMessage = asyncHandler(async (req, res) => {
  const { message } = req.body || {};

  if (!message) {
    return errorResponse(res, "Message is required", 400);
  }

  const grievance = await Grievance.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        messages: {
          senderId:   req.user._id,
          senderRole: "OT",
          message,
          sentAt:     new Date(),
        },
      },
      $set: { status: "in_progress" },
    },
    { new: true }
  );

  if (!grievance) {
    return errorResponse(res, "Grievance not found", 404);
  }

  return successResponse(
    res,
    "Message added successfully",
    { grievance }
  );
});

// ═══════════════════════════════════════════════════════════
// 5. FRANCHISE QUALITY RATINGS
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   POST /api/ops/franchise/:id/rate
// @desc    Internal franchise quality rating
// @access  Private (OT role)
// ─────────────────────────────────────────────────────────
// const rateFranchise = asyncHandler(async (req, res) => {
//   const { rating, remarks } = req.body || {};

//   if (!rating || rating < 1 || rating > 5) {
//     return errorResponse(
//       res,
//       "Rating must be between 1 and 5",
//       400
//     );
//   }

//   const franchise = await User.findOne({
//     _id:       req.params.id,
//     role:      { $in: ["FR", "FS"] },
//     isDeleted: false,
//   });

//   if (!franchise) {
//     return errorResponse(res, "Franchise not found", 404);
//   }

//   // Save internal rating in franchise profile
//   await FranchiseeProfile.findOneAndUpdate(
//     { userId: req.params.id, isDeleted: false },
//     {
//       $push: {
//         internalRatings: {
//           rating,
//           remarks:   remarks  || "",
//           ratedBy:   req.user._id,
//           ratedAt:   new Date(),
//           raterRole: "OT",
//         },
//       },
//     }
//   );

//   return successResponse(
//     res,
//     "Franchise rated successfully. Rating visible to Ops and Admin only.",
//     {
//       franchiseId:   req.params.id,
//       franchiseName: franchise.name,
//       rating,
//       remarks:       remarks || "",
//       ratedAt:       new Date(),
//       visibility:    "ops_and_admin_only",
//     }
//   );
// });

const rateFranchise = asyncHandler(async (req, res) => {
  const { rating, remarks } = req.body || {};

  if (!rating || rating < 1 || rating > 5) {
    return errorResponse(
      res,
      "Rating must be between 1 and 5",
      400
    );
  }

  // Check franchise user exists
  const franchise = await User.findOne({
    _id:       req.params.id,
    role:      { $in: ["FR", "FS"] },
    isDeleted: false,
  });

  if (!franchise) {
    return errorResponse(res, "Franchise not found", 404);
  }

  // Find franchise profile
  let franchiseProfile = await FranchiseeProfile.findOne({
    userId: req.params.id,
  });

  if (!franchiseProfile) {
    // Create basic profile with rating
    franchiseProfile = await FranchiseeProfile.create({
      userId: req.params.id,
      internalRatings: [{
        rating,
        remarks:   remarks || "",
        ratedBy:   req.user._id,
        ratedAt:   new Date(),
        raterRole: "OT",
      }],
    });
  } else {
    // Push rating to existing profile
    await FranchiseeProfile.findByIdAndUpdate(
      franchiseProfile._id,
      {
        $push: {
          internalRatings: {
            rating,
            remarks:   remarks || "",
            ratedBy:   req.user._id,
            ratedAt:   new Date(),
            raterRole: "OT",
          },
        },
      },
      { new: true }
    );
  }

  return successResponse(
    res,
    "Franchise rated successfully. Rating visible to Ops and Admin only.",
    {
      franchiseId:   req.params.id,
      franchiseName: franchise.name,
      rating,
      remarks:       remarks || "",
      ratedAt:       new Date(),
      visibility:    "ops_and_admin_only",
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/ops/franchise/:id/ratings
// @desc    Get franchise internal ratings
// @access  Private (OT role)
// ─────────────────────────────────────────────────────────

const getFranchiseRatings = asyncHandler(async (req, res) => {
  const franchise = await User.findOne({
    _id:       req.params.id,
    role:      { $in: ["FR", "FS"] },
    isDeleted: false,
  });

  if (!franchise) {
    return errorResponse(res, "Franchise not found", 404);
  }

  // Find profile without isDeleted filter
  const profile = await FranchiseeProfile.findOne({
    userId: req.params.id,
  }).select("businessName internalRatings");

  const ratings      = profile?.internalRatings || [];
  const normalizedRatings = ratings.map(({ rating, remarks }) => ({
    rating,
    remarks: remarks || "",
  }));
  const totalRatings = normalizedRatings.length;
  const avgRating    = totalRatings > 0
    ? (
        normalizedRatings.reduce((sum, r) => sum + r.rating, 0) /
        totalRatings
      ).toFixed(1)
    : 0;

  return successResponse(
    res,
    "Franchise ratings fetched successfully",
    {
      businessName:  profile?.businessName || franchise.name,
      summary: {
        totalRatings,
        averageRating: parseFloat(avgRating),
      },
      ratings: normalizedRatings,
    }
  );
});

module.exports = {
  // Team Summary
  getTeamSummary,
  // Onboarding
  onboardFranchise,
  onboardNCSP,
  onboardSupervisor,
  // Bookings
  getBookings,
  expediteBooking,
  // Grievances
  getGrievances,
  resolveGrievance,
  escalateGrievance,
  addGrievanceMessage,
  // Franchise Ratings
  rateFranchise,
  getFranchiseRatings,
};