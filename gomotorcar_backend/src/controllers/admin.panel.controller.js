const User         = require("../models/user.model");
const Subscription = require("../models/subscription.model");
const Booking      = require("../models/booking.model");
const Banner       = require("../models/banner.model");
const Policy       = require("../models/policy.model");
const WebsiteQuery = require("../models/websiteQuery.model");
const Coupon       = require("../models/coupon.model");
const Notification = require("../models/notification.model");
const QRStock      = require("../models/qrStock.model");
const Apartment    = require("../models/apartment.model");
const Grievance    = require("../models/grievance.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");
const crypto = require("crypto");

// ═══════════════════════════════════════════════════════════
// 1. DASHBOARD
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/dashboard
// @desc    Live KPIs dashboard
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
// const getDashboard = asyncHandler(async (req, res) => {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const tomorrow = new Date(today);
//   tomorrow.setDate(tomorrow.getDate() + 1);

//   const thisMonth = new Date(today);
//   thisMonth.setDate(1);
// 9
//   // Run all queries in parallel
//   const [
//     totalUsers,
//     totalCustomers,
//     totalCleaners,
//     totalNCSP,
//     totalFranchisees,
//     activeSubscriptions,
//     todayBookings,
//     monthBookings,
//     pendingApprovals,
//     openGrievances,
//     todayRevenue,
//     monthRevenue,
//   ] = await Promise.all([
//     User.countDocuments({ isDeleted: false }),
//     User.countDocuments({ role: "CU", isDeleted: false }),
//     User.countDocuments({ role: "CL", status: "active", isDeleted: false }),
//     User.countDocuments({ role: "NC", status: "active", isDeleted: false }),
//     User.countDocuments({ role: "FR", status: "active", isDeleted: false }),
//     Subscription.countDocuments({ status: "active", isDeleted: false }),
//     Booking.countDocuments({
//       createdAt: { $gte: today, $lt: tomorrow },
//       isDeleted: false,
//     }),
//     Booking.countDocuments({
//       createdAt: { $gte: thisMonth },
//       isDeleted: false,
//     }),
//     User.countDocuments({
//       status: "pending_approval",
//       isDeleted: false,
//     }),
//     Grievance.countDocuments({
//       status: { $in: ["open", "in_progress"] },
//       isDeleted: false,
//     }),
//     // Today revenue
//     Booking.aggregate([
//       {
//         $match: {
//           createdAt:     { $gte: today, $lt: tomorrow },
//           paymentStatus: "success",
//           isDeleted:     false,
//         },
//       },
//       { $group: { _id: null, total: { $sum: "$totalAmount" } } },
//     ]),
//     // Month revenue
//     Booking.aggregate([
//       {
//         $match: {
//           createdAt:     { $gte: thisMonth },
//           paymentStatus: "success",
//           isDeleted:     false,
//         },
//       },
//       { $group: { _id: null, total: { $sum: "$totalAmount" } } },
//     ]),
//   ]);

//   return successResponse(
//     res,
//     "Dashboard fetched successfully",
//     {
//       dashboard: {
//         users: {
//           total:        totalUsers,
//           customers:    totalCustomers,
//           cleaners:     totalCleaners,
//           ncsp:         totalNCSP,
//           franchisees:  totalFranchisees,
//         },
//         subscriptions: {
//           active: activeSubscriptions,
//         },
//         bookings: {
//           today: todayBookings,
//           month: monthBookings,
//         },
//         revenue: {
//           today: todayRevenue[0]?.total  || 0,
//           month: monthRevenue[0]?.total  || 0,
//         },
//         pendingApprovals,
//         openGrievances,
//       },
//     }
//   );
// });

const getDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const thisMonth = new Date(today);
  thisMonth.setDate(1);

  const [
    // Customer metrics
    totalCustomers,
    activeCustomers,
    newCustomersToday,

    // Cleaner metrics
    totalCleaners,
    activeCleaners,
    partTimeCleaners,
    fullTimeCleaners,
    pendingCleaners,

    // Supervisor metrics
    totalSupervisors,
    activeSupervisors,

    // NCSP metrics
    totalNCSP,
    activeNCSP,
    pendingNCSP,

    // Franchise metrics
    totalCSP,
    totalSteamWash,
    activeFranchisees,

    // Operations
    openGrievances,
    pendingApprovals,

    // Subscription metrics
    activeSubscriptions,
    renewalsDue,

    // Booking metrics
    todayBookings,
    monthBookings,

    // Revenue
    todayRevenue,
    monthRevenue,
    subscriptionRevenue,
    bookingRevenue,

    // Recent activities
    recentRegistrations,
    recentBookings,
    recentGrievances,
  ] = await Promise.all([

    // ─── Customers ────────────────────────────────────────
    User.countDocuments({ role: "CU", isDeleted: false }),
    User.countDocuments({ role: "CU", status: "active", isDeleted: false }),
    User.countDocuments({
      role:      "CU",
      createdAt: { $gte: today, $lt: tomorrow },
      isDeleted: false,
    }),

    // ─── Cleaners ─────────────────────────────────────────
    User.countDocuments({ role: "CL", isDeleted: false }),
    User.countDocuments({ role: "CL", status: "active", isDeleted: false }),
    // Part time / Full time from cleaner profiles
    require("../models/cleanerProfile.model")
      .countDocuments({ cleanerType: "part_time", isDeleted: false }),
    require("../models/cleanerProfile.model")
      .countDocuments({ cleanerType: "full_time", isDeleted: false }),
    User.countDocuments({
      role:      "CL",
      status:    "pending_approval",
      isDeleted: false,
    }),

    // ─── Supervisors ──────────────────────────────────────
    User.countDocuments({ role: "SU", isDeleted: false }),
    User.countDocuments({ role: "SU", status: "active", isDeleted: false }),

    // ─── NCSP ─────────────────────────────────────────────
    User.countDocuments({ role: "NC", isDeleted: false }),
    User.countDocuments({ role: "NC", status: "active", isDeleted: false }),
    User.countDocuments({
      role:      "NC",
      status:    "pending_approval",
      isDeleted: false,
    }),

    // ─── Franchise ────────────────────────────────────────
    User.countDocuments({ role: "FR", isDeleted: false }),
    User.countDocuments({ role: "FS", isDeleted: false }),
    User.countDocuments({
      role:      { $in: ["FR", "FS"] },
      status:    "active",
      isDeleted: false,
    }),

    // ─── Operations ───────────────────────────────────────
    require("../models/grievance.model")
      .countDocuments({
        status:    { $in: ["open", "in_progress"] },
        isDeleted: false,
      }),
    User.countDocuments({
      status:    "pending_approval",
      isDeleted: false,
    }),

    // ─── Subscriptions ────────────────────────────────────
    require("../models/subscription.model")
      .countDocuments({ status: "active", isDeleted: false }),
    // Renewals due in next 7 days
    require("../models/subscription.model")
      .countDocuments({
        status:  "active",
        endDate: {
          $gte: today,
          $lte: new Date(
            today.getTime() + 7 * 24 * 60 * 60 * 1000
          ),
        },
        isDeleted: false,
      }),

    // ─── Bookings ─────────────────────────────────────────
    require("../models/booking.model")
      .countDocuments({
        createdAt: { $gte: today, $lt: tomorrow },
        isDeleted: false,
      }),
    require("../models/booking.model")
      .countDocuments({
        createdAt: { $gte: thisMonth },
        isDeleted: false,
      }),

    // ─── Revenue ──────────────────────────────────────────
    require("../models/booking.model").aggregate([
      {
        $match: {
          createdAt:     { $gte: today, $lt: tomorrow },
          paymentStatus: "success",
          isDeleted:     false,
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    require("../models/booking.model").aggregate([
      {
        $match: {
          createdAt:     { $gte: thisMonth },
          paymentStatus: "success",
          isDeleted:     false,
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    require("../models/subscription.model").aggregate([
      {
        $match: {
          createdAt:     { $gte: thisMonth },
          paymentStatus: "success",
          isDeleted:     false,
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    require("../models/booking.model").aggregate([
      {
        $match: {
          createdAt:     { $gte: thisMonth },
          paymentStatus: "success",
          isDeleted:     false,
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),

    // ─── Recent Activities ────────────────────────────────
    User.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name role status createdAt"),
    require("../models/booking.model")
      .find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("customerId",  "name")
      .populate("serviceId",   "name")
      .select("bookingNo status totalAmount createdAt"),
    require("../models/grievance.model")
      .find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("raisedBy", "name role")
      .select("ticketNo type status createdAt"),
  ]);

  return successResponse(
    res,
    "Dashboard fetched successfully",
    {
      dashboard: {
        customers: {
          total:            totalCustomers,
          active:           activeCustomers,
          newToday:         newCustomersToday,
          renewalsDue:      renewalsDue,
        },
        cleaners: {
          total:            totalCleaners,
          active:           activeCleaners,
          partTime:         partTimeCleaners,
          fullTime:         fullTimeCleaners,
          pendingApprovals: pendingCleaners,
        },
        supervisors: {
          total:  totalSupervisors,
          active: activeSupervisors,
        },
        ncsp: {
          total:            totalNCSP,
          active:           activeNCSP,
          pendingApprovals: pendingNCSP,
        },
        franchise: {
          cspCount:         totalCSP,
          steamWashCount:   totalSteamWash,
          active:           activeFranchisees,
        },
        operations: {
          openGrievances,
          pendingApprovals,
          pendingOnboarding: 0,
        },
        subscriptions: {
          active:      activeSubscriptions,
          renewalsDue,
        },
        bookings: {
          today: todayBookings,
          month: monthBookings,
        },
        revenue: {
          today:        todayRevenue[0]?.total        || 0,
          month:        monthRevenue[0]?.total        || 0,
          subscription: subscriptionRevenue[0]?.total || 0,
          booking:      bookingRevenue[0]?.total      || 0,
        },
        recentActivities: {
          registrations: recentRegistrations,
          bookings:      recentBookings,
          grievances:    recentGrievances,
        },
      },
    }
  );
});

// ═══════════════════════════════════════════════════════════
// 2. CMS — BANNERS
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   POST /api/admin/panel/banners
// @desc    Create banner
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const createBanner = asyncHandler(async (req, res) => {
  const {
    title, description, imageUrl,
    actionType, actionUrl,
    placement, sortOrder,
    validFrom, validTo,
  } = req.body || {};

  const banner = await Banner.create({
    title, description, imageUrl,
    actionType: actionType || "none",
    actionUrl,
    placement:  placement  || "home",
    sortOrder:  sortOrder  || 0,
    validFrom:  validFrom  ? new Date(validFrom)  : null,
    validTo:    validTo    ? new Date(validTo)    : null,
    createdBy:  req.user._id,
  });

  return createdResponse(
    res,
    "Banner created successfully",
    { banner }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/banners
// @desc    Get all banners
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getBanners = asyncHandler(async (req, res) => {
  const { placement } = req.query;
  const filter = { isDeleted: false };
  if (placement) filter.placement = placement;

  const banners = await Banner.find(filter)
    .sort({ sortOrder: 1, createdAt: -1 });

  return successResponse(
    res,
    "Banners fetched successfully",
    { count: banners.length, banners }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/banners/active
// @desc    Get active banners (for app home screen)
// @access  Private
// ─────────────────────────────────────────────────────────
const getActiveBanners = asyncHandler(async (req, res) => {
  const { placement = "home" } = req.query;
  const now = new Date();

  const banners = await Banner.find({
    isActive:  true,
    isDeleted: false,
    placement,
    $or: [
      { validFrom: null },
      { validFrom: { $lte: now } },
    ],
    $or: [
      { validTo: null },
      { validTo: { $gte: now } },
    ],
  }).sort({ sortOrder: 1 });

  return successResponse(
    res,
    "Active banners fetched successfully",
    { count: banners.length, banners }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/panel/banners/:id
// @desc    Update banner
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const updateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndUpdate(
    req.params.id,
    { $set: req.body || {} },
    { new: true, runValidators: true }
  );

  if (!banner) {
    return errorResponse(res, "Banner not found", 404);
  }

  return successResponse(
    res,
    "Banner updated successfully",
    { banner }
  );
});

// ─────────────────────────────────────────────────────────
// @route   DELETE /api/admin/panel/banners/:id
// @desc    Delete banner
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const deleteBanner = asyncHandler(async (req, res) => {
  await Banner.findByIdAndUpdate(req.params.id, {
    $set: { isDeleted: true, isActive: false },
  });
  return successResponse(res, "Banner deleted successfully");
});

// ═══════════════════════════════════════════════════════════
// 3. CMS — POLICIES
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   POST /api/admin/panel/policies
// @desc    Create or update policy
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const upsertPolicy = asyncHandler(async (req, res) => {
  const { type, title, content, version } = req.body || {};

  const policy = await Policy.findOneAndUpdate(
    { type },
    {
      $set: {
        title,
        content,
        version:   version   || "1.0",
        updatedBy: req.user._id,
      },
    },
    { new: true, upsert: true, runValidators: true }
  );

  return successResponse(
    res,
    "Policy saved successfully",
    { policy }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/policies
// @desc    Get all policies
// @access  Private
// ─────────────────────────────────────────────────────────
const getPolicies = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const filter = {};
  if (type) filter.type = type;

  const policies = await Policy.find(filter);

  return successResponse(
    res,
    "Policies fetched successfully",
    { count: policies.length, policies }
  );
});

// ═══════════════════════════════════════════════════════════
// 4. QR CODE MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   POST /api/admin/panel/qr-codes/batch
// @desc    Generate QR code batch
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const generateQRBatch = asyncHandler(async (req, res) => {
  const { count, supervisorId, prefix } = req.body || {};

  if (!count || count < 1) {
    return errorResponse(res, "Count is required", 400);
  }

  if (count > 500) {
    return errorResponse(
      res,
      "Maximum 500 QR codes per batch",
      400
    );
  }

  // Generate QR codes
  const qrCodes = [];
  const timestamp = Date.now().toString(36).toUpperCase();

  for (let i = 0; i < count; i++) {
    const random  = crypto.randomBytes(3)
      .toString("hex").toUpperCase();
    const qrCode  = `${prefix || "GMC"}-${timestamp}-${random}`;
    const idNo    = String(i + 1).padStart(5, "0");

    qrCodes.push({
      qrCode,
      qrIdentificationNo: idNo,
      supervisorId:       supervisorId || null,
      status:             "available",
    });
  }

  // Save to QR stock
  const created = await QRStock.insertMany(qrCodes);

  return createdResponse(
    res,
    `${count} QR codes generated successfully`,
    {
      count:   created.length,
      prefix:  prefix || "GMC",
      firstQR: created[0]?.qrCode,
      lastQR:  created[created.length - 1]?.qrCode,
      supervisorId: supervisorId || "Unassigned",
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/qr-codes
// @desc    Get all QR codes with filters
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getQRCodes = asyncHandler(async (req, res) => {
  const {
    status,
    supervisorId,
    page  = 1,
    limit = 20,
  } = req.query;

  const filter = { isDeleted: false };
  if (status)       filter.status       = status;
  if (supervisorId) filter.supervisorId = supervisorId;

  const [qrCodes, total] = await Promise.all([
    QRStock.find(filter)
      .populate("supervisorId", "name partnerId")
      .populate("allocatedTo",  "name mobileNo")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    QRStock.countDocuments(filter),
  ]);

  return successResponse(
    res,
    "QR codes fetched successfully",
    {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      qrCodes,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/panel/qr-codes/:id/assign
// @desc    Assign QR batch to supervisor
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const assignQRToSupervisor = asyncHandler(async (req, res) => {
  const { supervisorId } = req.body || {};

  if (!supervisorId) {
    return errorResponse(res, "Supervisor ID is required", 400);
  }

  const qr = await QRStock.findByIdAndUpdate(
    req.params.id,
    { $set: { supervisorId } },
    { new: true }
  );

  if (!qr) {
    return errorResponse(res, "QR code not found", 404);
  }

  return successResponse(
    res,
    "QR code assigned to supervisor",
    { qr }
  );
});

// ═══════════════════════════════════════════════════════════
// 5. REPORTS
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/reports/subscriptions
// @desc    Subscriptions report
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getSubscriptionsReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  const filter = { isDeleted: false };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }

  const subscriptions = await Subscription.find(filter)
    .populate("customerId", "name mobileNo")
    .populate("packageId",  "name price")
    .populate("vehicleId",  "registrationNo brand")
    .sort({ createdAt: -1 });

  // Summary
  const total   = subscriptions.length;
  const active  = subscriptions.filter(
    (s) => s.status === "active"
  ).length;
  const revenue = subscriptions.reduce(
    (sum, s) => sum + (s.amount || 0), 0
  );

  return successResponse(
    res,
    "Subscriptions report fetched",
    {
      summary: { total, active, revenue },
      subscriptions,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/reports/bookings
// @desc    Bookings report
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getBookingsReport = asyncHandler(async (req, res) => {
  const { from, to, status } = req.query;

  const filter = { isDeleted: false };
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }

  const bookings = await Booking.find(filter)
    .populate("customerId",  "name mobileNo")
    .populate("franchiseId", "name")
    .populate("serviceId",   "name")
    .sort({ createdAt: -1 });

  const total   = bookings.length;
  const revenue = bookings
    .filter((b) => b.paymentStatus === "success")
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const statusSummary = {
    pending:   0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };

  bookings.forEach((b) => {
    if (statusSummary[b.status] !== undefined) {
      statusSummary[b.status]++;
    }
  });

  return successResponse(
    res,
    "Bookings report fetched",
    {
      summary: { total, revenue, ...statusSummary },
      bookings,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/reports/revenue
// @desc    Revenue report
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getRevenueReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  const matchFilter = { paymentStatus: "success", isDeleted: false };
  if (from || to) {
    matchFilter.createdAt = {};
    if (from) matchFilter.createdAt.$gte = new Date(from);
    if (to)   matchFilter.createdAt.$lte = new Date(to);
  }

  // Monthly revenue breakdown
  const monthlyRevenue = await Booking.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: {
          year:  { $year:  "$createdAt" },
          month: { $month: "$createdAt" },
        },
        revenue:       { $sum: "$totalAmount" },
        bookingsCount: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  // Total revenue
  const totalRevenue = await Booking.aggregate([
    { $match: matchFilter },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  // Subscription revenue
  const subMatchFilter = {
    paymentStatus: "success",
    isDeleted:     false,
  };

  const subscriptionRevenue = await Subscription.aggregate([
    { $match: subMatchFilter },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  return successResponse(
    res,
    "Revenue report fetched",
    {
      summary: {
        totalBookingRevenue:
          totalRevenue[0]?.total || 0,
        totalSubscriptionRevenue:
          subscriptionRevenue[0]?.total || 0,
        grandTotal:
          (totalRevenue[0]?.total || 0) +
          (subscriptionRevenue[0]?.total || 0),
      },
      monthlyBreakdown: monthlyRevenue,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/reports/grievances
// @desc    Grievances report
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getGrievancesReport = asyncHandler(async (req, res) => {
  const { from, to, status } = req.query;

  const filter = { isDeleted: false };
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }

  const grievances = await Grievance.find(filter)
    .populate("raisedBy", "name mobileNo role")
    .sort({ createdAt: -1 });

  const summary = {
    total:       grievances.length,
    open:        grievances.filter(g => g.status === "open").length,
    in_progress: grievances.filter(g => g.status === "in_progress").length,
    resolved:    grievances.filter(g => g.status === "resolved").length,
    escalated:   grievances.filter(g => g.status === "escalated").length,
    closed:      grievances.filter(g => g.status === "closed").length,
  };

  return successResponse(
    res,
    "Grievances report fetched",
    { summary, grievances }
  );
});

// ═══════════════════════════════════════════════════════════
// 6. WEBSITE QUERIES
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   POST /api/admin/panel/website/queries
// @desc    Submit query from website (Public)
// @access  Public
// ─────────────────────────────────────────────────────────
const submitWebsiteQuery = asyncHandler(async (req, res) => {
  const {
    name, email, mobileNo,
    queryType, subject, message,
  } = req.body || {};

  const query = await WebsiteQuery.create({
    name, email, mobileNo,
    queryType: queryType || "general",
    subject,
    message,
  });

  return createdResponse(
    res,
    "Query submitted successfully. We will get back to you shortly.",
    { ticketId: query._id }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/website/queries
// @desc    Get all website queries
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getWebsiteQueries = asyncHandler(async (req, res) => {
  const {
    status,
    queryType,
    page  = 1,
    limit = 10,
  } = req.query;

  const filter = { isDeleted: false };
  if (status)    filter.status    = status;
  if (queryType) filter.queryType = queryType;

  const [queries, total] = await Promise.all([
    WebsiteQuery.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    WebsiteQuery.countDocuments(filter),
  ]);

  return successResponse(
    res,
    "Website queries fetched successfully",
    {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      queries,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/admin/panel/website/queries/:id/respond
// @desc    Admin replies to website query
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const respondToQuery = asyncHandler(async (req, res) => {
  const { reply, status } = req.body || {};

  const query = await WebsiteQuery.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        reply,
        repliedBy: req.user._id,
        repliedAt: new Date(),
        status:    status || "resolved",
      },
    },
    { new: true }
  );

  if (!query) {
    return errorResponse(res, "Query not found", 404);
  }

  return successResponse(
    res,
    "Reply sent successfully",
    { query }
  );
});

// ═══════════════════════════════════════════════════════════
// 7. APARTMENT MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   POST /api/admin/panel/apartments
// @desc    Create apartment
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const createApartment = asyncHandler(async (req, res) => {
  const {
    name, society, address,
    latitude, longitude,
    geoFenceRadius, clusterType,
    qrCodePrefix, supervisorId,
  } = req.body || {};

  const apartment = await Apartment.create({
    name,
    society,
    address,
    location: {
      type:        "Point",
      coordinates: [
        parseFloat(longitude) || 0,
        parseFloat(latitude)  || 0,
      ],
    },
    geoFenceRadius: geoFenceRadius || 100,
    clusterType:    clusterType    || "apartment",
    qrCodePrefix,
    supervisorId:   supervisorId   || null,
    isActive:       true,
  });

  return createdResponse(
    res,
    "Apartment created successfully",
    { apartment }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/apartments
// @desc    Get all apartments
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getApartments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const [apartments, total] = await Promise.all([
    Apartment.find({ isDeleted: false })
      .populate("supervisorId", "name mobileNo partnerId")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Apartment.countDocuments({ isDeleted: false }),
  ]);

  return successResponse(
    res,
    "Apartments fetched successfully",
    {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      apartments,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/panel/apartments/:id
// @desc    Update apartment
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const updateApartment = asyncHandler(async (req, res) => {
  if (req.body?.latitude && req.body?.longitude) {
    req.body.location = {
      type:        "Point",
      coordinates: [
        parseFloat(req.body.longitude),
        parseFloat(req.body.latitude),
      ],
    };
    delete req.body.latitude;
    delete req.body.longitude;
  }

  const apartment = await Apartment.findByIdAndUpdate(
    req.params.id,
    { $set: req.body || {} },
    { new: true }
  ).populate("supervisorId", "name mobileNo");

  if (!apartment) {
    return errorResponse(res, "Apartment not found", 404);
  }

  return successResponse(
    res,
    "Apartment updated successfully",
    { apartment }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/panel/apartments/:id/supervisor
// @desc    Assign supervisor to apartment
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const assignSupervisorToApartment = asyncHandler(
  async (req, res) => {
    const { supervisorId } = req.body || {};

    const apartment = await Apartment.findByIdAndUpdate(
      req.params.id,
      { $set: { supervisorId } },
      { new: true }
    ).populate("supervisorId", "name mobileNo partnerId");

    if (!apartment) {
      return errorResponse(res, "Apartment not found", 404);
    }

    return successResponse(
      res,
      "Supervisor assigned to apartment successfully",
      { apartment }
    );
  }
);

// ═══════════════════════════════════════════════════════════
// 8. COUPON MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   POST /api/admin/panel/coupons
// @desc    Create coupon
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const createCoupon = asyncHandler(async (req, res) => {
  const {
    code, description,
    discountType, discountValue,
    minOrderAmount, maxDiscountAmount,
    maxUsage, maxUsagePerUser,
    applicableOn,
    validFrom, validTo,
  } = req.body || {};

  const coupon = await Coupon.create({
    code:               code.toUpperCase(),
    description,
    discountType,
    discountValue,
    minOrderAmount:     minOrderAmount     || 0,
    maxDiscountAmount:  maxDiscountAmount  || null,
    maxUsage:           maxUsage           || 100,
    maxUsagePerUser:    maxUsagePerUser    || 1,
    applicableOn:       applicableOn       || "all",
    validFrom:          new Date(validFrom),
    validTo:            new Date(validTo),
    createdBy:          req.user._id,
  });

  return createdResponse(
    res,
    "Coupon created successfully",
    { coupon }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/coupons
// @desc    Get all coupons
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({ isDeleted: false })
    .sort({ createdAt: -1 });

  return successResponse(
    res,
    "Coupons fetched successfully",
    { count: coupons.length, coupons }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/admin/panel/coupons/validate
// @desc    Validate coupon code
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, orderAmount, purpose } = req.body || {};

  const coupon = await Coupon.findOne({
    code:      code.toUpperCase(),
    isActive:  true,
    isDeleted: false,
    validFrom: { $lte: new Date() },
    validTo:   { $gte: new Date() },
  });

  if (!coupon) {
    return errorResponse(
      res,
      "Invalid or expired coupon code",
      400
    );
  }

  // Check usage limit
  if (coupon.usedCount >= coupon.maxUsage) {
    return errorResponse(
      res,
      "Coupon usage limit exceeded",
      400
    );
  }

  // Check min order amount
  if (orderAmount < coupon.minOrderAmount) {
    return errorResponse(
      res,
      `Minimum order amount ₹${coupon.minOrderAmount} required`,
      400
    );
  }

  // Check applicability
  if (
    coupon.applicableOn !== "all" &&
    coupon.applicableOn !== purpose
  ) {
    return errorResponse(
      res,
      `Coupon not applicable on ${purpose}`,
      400
    );
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = (orderAmount * coupon.discountValue) / 100;
    if (
      coupon.maxDiscountAmount &&
      discountAmount > coupon.maxDiscountAmount
    ) {
      discountAmount = coupon.maxDiscountAmount;
    }
  } else {
    discountAmount = coupon.discountValue;
  }

  const finalAmount = Math.max(0, orderAmount - discountAmount);

  return successResponse(
    res,
    "Coupon applied successfully",
    {
      coupon: {
        code:          coupon.code,
        discountType:  coupon.discountType,
        discountValue: coupon.discountValue,
      },
      orderAmount,
      discountAmount: Math.round(discountAmount),
      finalAmount:    Math.round(finalAmount),
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/panel/coupons/:id
// @desc    Update coupon
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    { $set: req.body || {} },
    { new: true, runValidators: true }
  );

  if (!coupon) {
    return errorResponse(res, "Coupon not found", 404);
  }

  return successResponse(
    res,
    "Coupon updated successfully",
    { coupon }
  );
});

// ─────────────────────────────────────────────────────────
// @route   DELETE /api/admin/panel/coupons/:id
// @desc    Delete coupon
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const deleteCoupon = asyncHandler(async (req, res) => {
  await Coupon.findByIdAndUpdate(req.params.id, {
    $set: { isDeleted: true, isActive: false },
  });
  return successResponse(res, "Coupon deleted successfully");
});

// ═══════════════════════════════════════════════════════════
// 9. NOTIFICATION BROADCAST
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   POST /api/admin/panel/notifications/broadcast
// @desc    Send notification to all users or specific roles
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const broadcastNotification = asyncHandler(async (req, res) => {
  const {
    title,
    message,
    targetRoles,
    type,
  } = req.body || {};

  if (!title || !message) {
    return errorResponse(
      res,
      "Title and message are required",
      400
    );
  }

  // Get target users
  const filter = { isDeleted: false, status: "active" };
  if (targetRoles && targetRoles.length > 0) {
    filter.role = { $in: targetRoles };
  }

  const users = await User.find(filter).select("_id");

  // Create notification for each user
  const notifications = users.map((u) => ({
    userId:      u._id,
    title,
    message,
    type:        type        || "broadcast",
    targetRoles: targetRoles || [],
    isBroadcast: true,
  }));

  await Notification.insertMany(notifications);

  return successResponse(
    res,
    "Notification broadcast successfully",
    {
      sentTo:      users.length,
      targetRoles: targetRoles || "all",
      title,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/notifications
// @desc    Get notifications for logged in user
// @access  Private
// ─────────────────────────────────────────────────────────
const getUserNotifications = asyncHandler(async (req, res) => {
  const {
    page  = 1,
    limit = 10,
  } = req.query;

  const [notifications, total] = await Promise.all([
    Notification.find({
      userId:    req.user._id,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Notification.countDocuments({
      userId:    req.user._id,
      isDeleted: false,
    }),
  ]);

  const unreadCount = await Notification.countDocuments({
    userId:    req.user._id,
    isRead:    false,
    isDeleted: false,
  });

  return successResponse(
    res,
    "Notifications fetched successfully",
    {
      total,
      unreadCount,
      page:          parseInt(page),
      totalPages:    Math.ceil(total / parseInt(limit)),
      notifications,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PATCH /api/admin/panel/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
// ─────────────────────────────────────────────────────────
const markNotificationRead = asyncHandler(async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, {
    $set: { isRead: true, readAt: new Date() },
  });

  return successResponse(res, "Notification marked as read");
});

// ─────────────────────────────────────────────────────────
// @route   PATCH /api/admin/panel/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
// ─────────────────────────────────────────────────────────
const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return successResponse(
    res,
    "All notifications marked as read"
  );
});


// ═══════════════════════════════════════════════════════════
// CUSTOMER MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/customers
// @desc    Get all customers with details
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getCustomers = asyncHandler(async (req, res) => {
  const {
    status,
    search,
    page  = 1,
    limit = 10,
  } = req.query;

  const filter = {
    role:      "CU",
    isDeleted: false,
  };

  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name:     { $regex: search, $options: "i" } },
      { mobileNo: { $regex: search, $options: "i" } },
      { email:    { $regex: search, $options: "i" } },
    ];
  }

  const [customers, total] = await Promise.all([
    User.find(filter)
      .select("-sessionToken -password -__v")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  // Add subscription and vehicle count
  const Subscription = require("../models/subscription.model");
  const Vehicle      = require("../models/vehicle.model");

  const enriched = await Promise.all(
    customers.map(async (c) => {
      const [activeSub, vehicleCount] = await Promise.all([
        Subscription.findOne({
          customerId: c._id,
          status:     "active",
          isDeleted:  false,
        }).populate("cleanerId",    "name")
          .populate("supervisorId", "name"),
        Vehicle.countDocuments({
          userId:    c._id,
          isDeleted: false,
        }),
      ]);

      return {
        ...c.toObject(),
        activeSubscription: activeSub,
        vehicleCount,
      };
    })
  );

  return successResponse(
    res,
    "Customers fetched successfully",
    {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      customers:  enriched,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/customers/:id
// @desc    Get customer full details with all tabs
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getCustomerDetails = asyncHandler(async (req, res) => {
  const Subscription   = require("../models/subscription.model");
  const Vehicle        = require("../models/vehicle.model");
  const Address        = require("../models/address.model");
  const Booking        = require("../models/booking.model");
  const WorkSession    = require("../models/workSession.model");
  const Grievance      = require("../models/grievance.model");

  const customer = await User.findOne({
    _id:       req.params.id,
    role:      "CU",
    isDeleted: false,
  }).select("-sessionToken -password -__v");

  if (!customer) {
    return errorResponse(res, "Customer not found", 404);
  }

  const [
    vehicles,
    addresses,
    subscriptions,
    bookings,
    cleaningHistory,
    grievances,
  ] = await Promise.all([
    Vehicle.find({ userId: customer._id, isDeleted: false }),
    Address.find({ userId: customer._id, isDeleted: false }),
    Subscription.find({ customerId: customer._id, isDeleted: false })
      .populate("packageId",  "name price durationDays")
      .populate("cleanerId",  "name mobileNo partnerId")
      .populate("supervisorId","name mobileNo")
      .sort({ createdAt: -1 }),
    Booking.find({ customerId: customer._id, isDeleted: false })
      .populate("serviceId",   "name")
      .populate("franchiseId", "name")
      .sort({ createdAt: -1 })
      .limit(10),
    WorkSession.find({ customerId: customer._id, isDeleted: false })
      .populate("cleanerId", "name")
      .sort({ workDate: -1 })
      .limit(20),
    Grievance.find({ raisedBy: customer._id, isDeleted: false })
      .sort({ createdAt: -1 }),
  ]);

  return successResponse(
    res,
    "Customer details fetched successfully",
    {
      customer,
      vehicles,
      addresses,
      subscriptions,
      bookings,
      cleaningHistory,
      grievances,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/panel/customers/:id/suspend
// @desc    Suspend customer account
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const suspendCustomer = asyncHandler(async (req, res) => {
  const { reason } = req.body || {};

  const customer = await User.findOneAndUpdate(
    { _id: req.params.id, role: "CU", isDeleted: false },
    { $set: { status: "inactive" } },
    { new: true }
  );

  if (!customer) {
    return errorResponse(res, "Customer not found", 404);
  }

  return successResponse(
    res,
    "Customer suspended successfully",
    { customerId: customer._id, status: customer.status }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/panel/customers/:id/activate
// @desc    Activate customer account
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const activateCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findOneAndUpdate(
    { _id: req.params.id, role: "CU", isDeleted: false },
    { $set: { status: "active" } },
    { new: true }
  );

  if (!customer) {
    return errorResponse(res, "Customer not found", 404);
  }

  return successResponse(
    res,
    "Customer activated successfully",
    { customerId: customer._id, status: customer.status }
  );
});


// ═══════════════════════════════════════════════════════════
// SUBSCRIPTION MANAGEMENT
// ═══════════════════════════════════════════════════════════

const getAdminSubscriptions = asyncHandler(async (req, res) => {
  const Subscription = require("../models/subscription.model");
  const {
    status, page = 1, limit = 10,
  } = req.query;

  const filter = { isDeleted: false };
  if (status) filter.status = status;

  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter)
      .populate("customerId",   "name mobileNo")
      .populate("packageId",    "name price durationDays")
      .populate("vehicleId",    "registrationNo brand")
      .populate("cleanerId",    "name mobileNo partnerId")
      .populate("supervisorId", "name mobileNo")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Subscription.countDocuments(filter),
  ]);

  return successResponse(
    res,
    "Subscriptions fetched successfully",
    {
      total,
      page:          parseInt(page),
      totalPages:    Math.ceil(total / parseInt(limit)),
      subscriptions,
    }
  );
});

const adminAssignCleaner = asyncHandler(async (req, res) => {
  const Subscription = require("../models/subscription.model");
  const { cleanerId } = req.body || {};

  const subscription = await Subscription.findByIdAndUpdate(
    req.params.id,
    { $set: { cleanerId } },
    { new: true }
  );

  if (!subscription) {
    return errorResponse(res, "Subscription not found", 404);
  }

  return successResponse(
    res,
    "Cleaner assigned successfully",
    { subscriptionId: subscription._id, cleanerId }
  );
});

const adminChangeSupervisor = asyncHandler(async (req, res) => {
  const Subscription = require("../models/subscription.model");
  const { supervisorId } = req.body || {};

  const subscription = await Subscription.findByIdAndUpdate(
    req.params.id,
    { $set: { supervisorId } },
    { new: true }
  );

  if (!subscription) {
    return errorResponse(res, "Subscription not found", 404);
  }

  return successResponse(
    res,
    "Supervisor changed successfully",
    { subscriptionId: subscription._id, supervisorId }
  );
});

const adminCancelSubscription = asyncHandler(async (req, res) => {
  const Subscription = require("../models/subscription.model");
  const { reason } = req.body || {};

  const subscription = await Subscription.findByIdAndUpdate(
    req.params.id,
    { $set: { status: "cancelled" } },
    { new: true }
  );

  if (!subscription) {
    return errorResponse(res, "Subscription not found", 404);
  }

  return successResponse(
    res,
    "Subscription cancelled successfully",
    { subscriptionId: subscription._id }
  );
});

// ═══════════════════════════════════════════════════════════
// CLEANER MANAGEMENT
// ═══════════════════════════════════════════════════════════

const getCleanerList = asyncHandler(async (req, res) => {
  const CleanerProfile = require("../models/cleanerProfile.model");
  const Subscription   = require("../models/subscription.model");
  const {
    status, search,
    page = 1, limit = 10,
  } = req.query;

  const filter = { role: "CL", isDeleted: false };
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name:     { $regex: search, $options: "i" } },
      { mobileNo: { $regex: search, $options: "i" } },
    ];
  }

  const [cleaners, total] = await Promise.all([
    User.find(filter)
      .select("-sessionToken -password -__v")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  // Enrich with profile and assigned cars
  const enriched = await Promise.all(
    cleaners.map(async (c) => {
      const [profile, assignedCars] = await Promise.all([
        CleanerProfile.findOne({
          userId:    c._id,
          isDeleted: false,
        }).select("cleanerType preferredAreas"),
        Subscription.countDocuments({
          cleanerId: c._id,
          status:    "active",
          isDeleted: false,
        }),
      ]);

      return {
        ...c.toObject(),
        cleanerType:  profile?.cleanerType || "unknown",
        assignedCars,
      };
    })
  );

  return successResponse(
    res,
    "Cleaners fetched successfully",
    {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      cleaners:   enriched,
    }
  );
});

const getCleanerFullProfile = asyncHandler(async (req, res) => {
  const CleanerProfile = require("../models/cleanerProfile.model");
  const Subscription   = require("../models/subscription.model");
  const WorkSession    = require("../models/workSession.model");
  const Earnings       = require("../models/earnings.model");
  const Inventory      = require("../models/inventory.model");
  const Grievance      = require("../models/grievance.model");

  const cleaner = await User.findOne({
    _id:       req.params.id,
    role:      "CL",
    isDeleted: false,
  }).select("-sessionToken -password");

  if (!cleaner) {
    return errorResponse(res, "Cleaner not found", 404);
  }

  const [
    profile,
    assignedCars,
    recentSessions,
    earnings,
    inventory,
    grievances,
  ] = await Promise.all([
    CleanerProfile.findOne({
      userId:    cleaner._id,
      isDeleted: false,
    }),
    Subscription.find({
      cleanerId: cleaner._id,
      status:    "active",
      isDeleted: false,
    })
      .populate("customerId", "name mobileNo")
      .populate("vehicleId",  "registrationNo brand"),
    WorkSession.find({
      cleanerId: cleaner._id,
      isDeleted: false,
    })
      .sort({ workDate: -1 })
      .limit(20),
    Earnings.find({
      cleanerId: cleaner._id,
      isDeleted: false,
    }).sort({ date: -1 }).limit(10),
    Inventory.find({
      cleanerId: cleaner._id,
      isDeleted: false,
    }),
    Grievance.find({
      raisedBy:  cleaner._id,
      isDeleted: false,
    }),
  ]);

  return successResponse(
    res,
    "Cleaner full profile fetched successfully",
    {
      cleaner,
      profile,
      assignedCars,
      recentSessions,
      earnings,
      inventory,
      grievances,
    }
  );
});

// ═══════════════════════════════════════════════════════════
// GRIEVANCE MANAGEMENT
// ═══════════════════════════════════════════════════════════

const getAllGrievances = asyncHandler(async (req, res) => {
  const Grievance = require("../models/grievance.model");
  const {
    status, type, raisedByRole,
    page = 1, limit = 10,
  } = req.query;

  const filter = { isDeleted: false };
  if (status)      filter.status      = status;
  if (type)        filter.type        = type;
  if (raisedByRole)filter.raisedByRole= raisedByRole;

  const [grievances, total] = await Promise.all([
    Grievance.find(filter)
      .populate("raisedBy",  "name mobileNo role partnerId")
      .populate("resolvedBy","name")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Grievance.countDocuments(filter),
  ]);

  // Summary counts
  const summary = await Grievance.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  return successResponse(
    res,
    "Grievances fetched successfully",
    {
      summary,
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      grievances,
    }
  );
});

const resolveGrievance = asyncHandler(async (req, res) => {
  const Grievance = require("../models/grievance.model");
  const { resolution, status } = req.body || {};

  const grievance = await Grievance.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        resolution,
        status:     status     || "resolved",
        resolvedBy: req.user._id,
        resolvedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!grievance) {
    return errorResponse(res, "Grievance not found", 404);
  }

  return successResponse(
    res,
    "Grievance resolved successfully",
    { grievance }
  );
});

const escalateGrievance = asyncHandler(async (req, res) => {
  const Grievance = require("../models/grievance.model");
  const { reason } = req.body || {};

  const grievance = await Grievance.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        status:      "escalated",
        isEscalated: true,
        escalatedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!grievance) {
    return errorResponse(res, "Grievance not found", 404);
  }

  return successResponse(
    res,
    "Grievance escalated successfully",
    { grievance }
  );
});

const addGrievanceMessage = asyncHandler(async (req, res) => {
  const Grievance = require("../models/grievance.model");
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
          senderRole: req.user.role,
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
// LEAD MANAGEMENT
// ═══════════════════════════════════════════════════════════

const getAllLeads = asyncHandler(async (req, res) => {
  const Lead = require("../models/lead.model");
  const {
    status, channel,
    page = 1, limit = 10,
  } = req.query;

  const filter = { isDeleted: false };
  if (status)  filter.status  = status;
  if (channel) filter.channel = channel;

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate("customerId",    "name mobileNo")
      .populate("providerId",    "name mobileNo")
      .populate("ncspProfileId", "businessName")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Lead.countDocuments(filter),
  ]);

  return successResponse(
    res,
    "Leads fetched successfully",
    {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      leads,
    }
  );
});

// ═══════════════════════════════════════════════════════════
// PAYMENT MANAGEMENT
// ═══════════════════════════════════════════════════════════

const getAllPayments = asyncHandler(async (req, res) => {
  const Payment = require("../models/payment.model");
  const {
    purpose, status,
    page = 1, limit = 10,
  } = req.query;

  const filter = { isDeleted: false };
  if (purpose) filter.purpose = purpose;
  if (status)  filter.status  = status;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("customerId", "name mobileNo")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Payment.countDocuments(filter),
  ]);

  return successResponse(
    res,
    "Payments fetched successfully",
    {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      payments,
    }
  );
});

const getWalletTransactions = asyncHandler(async (req, res) => {
  const Wallet = require("../models/wallet.model");

  const wallets = await Wallet.find()
    .populate("userId", "name mobileNo role")
    .sort({ updatedAt: -1 });

  return successResponse(
    res,
    "Wallet transactions fetched successfully",
    {
      count:   wallets.length,
      wallets,
    }
  );
});

// ═══════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════

const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    action, userId,
    page = 1, limit = 20,
  } = req.query;

  // For now returning recent user activities
  // Full audit log system in Phase 14
  const filter = { isDeleted: false };
  if (userId) filter._id = userId;

  const users = await User.find(filter)
    .select("name mobileNo role status lastLoginAt updatedAt")
    .sort({ updatedAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  return successResponse(
    res,
    "Audit logs fetched successfully",
    {
      page:    parseInt(page),
      logs:    users,
      message: "Full audit log system coming in Phase 14",
    }
  );
});

// ═══════════════════════════════════════════════════════════
// BOOKING MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/bookings
// @desc    Get all bookings with filters
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getAdminBookings = asyncHandler(async (req, res) => {
  const Booking = require("../models/booking.model");
  const {
    status, search,
    from, to,
    page = 1, limit = 10,
  } = req.query;

  const filter = { isDeleted: false };
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }
  if (search) {
    filter.$or = [
      { bookingNo: { $regex: search, $options: "i" } },
    ];
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("customerId",  "name mobileNo")
      .populate("franchiseId", "name mobileNo")
      .populate("serviceId",   "name serviceType")
      .populate("vehicleId",   "registrationNo brand")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Booking.countDocuments(filter),
  ]);

  // Status summary
  const statusSummary = {
    pending:   0,
    confirmed: 0,
    started:   0,
    completed: 0,
    cancelled: 0,
  };
  bookings.forEach((b) => {
    if (statusSummary[b.status] !== undefined) {
      statusSummary[b.status]++;
    }
  });

  return successResponse(
    res,
    "Bookings fetched successfully",
    {
      total,
      page:          parseInt(page),
      totalPages:    Math.ceil(total / parseInt(limit)),
      statusSummary,
      bookings,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/bookings/:id
// @desc    Get booking full details with all tabs
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getAdminBookingDetails = asyncHandler(async (req, res) => {
  const Booking = require("../models/booking.model");

  const booking = await Booking.findOne({
    _id:       req.params.id,
    isDeleted: false,
  })
    .populate("customerId",        "name mobileNo email")
    .populate("franchiseId",       "name mobileNo")
    .populate("serviceId",         "name description pricing")
    .populate("vehicleId",         "registrationNo brand model category")
    .populate("customerAddressId", "line1 city pinCode");

  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  // Build timeline
  const timeline = [];

  if (booking.createdAt) {
    timeline.push({
      stage:     "created",
      label:     "Booking Created",
      timestamp: booking.createdAt,
    });
  }
  if (booking.assignedAt) {
    timeline.push({
      stage:     "assigned",
      label:     "Technician Assigned",
      timestamp: booking.assignedAt,
    });
  }
  if (booking.inTransitAt) {
    timeline.push({
      stage:     "in_transit",
      label:     "In Transit",
      timestamp: booking.inTransitAt,
    });
  }
  if (booking.startedAt) {
    timeline.push({
      stage:     "started",
      label:     "Service Started",
      timestamp: booking.startedAt,
    });
  }
  if (booking.completedAt) {
    timeline.push({
      stage:     "completed",
      label:     "Service Completed",
      timestamp: booking.completedAt,
    });
  }
  if (booking.cancelledAt) {
    timeline.push({
      stage:     "cancelled",
      label:     "Booking Cancelled",
      timestamp: booking.cancelledAt,
    });
  }

  return successResponse(
    res,
    "Booking details fetched successfully",
    {
      booking,
      timeline,
      tabs: {
        customer: {
          name:     booking.customerId?.name,
          mobile:   booking.customerId?.mobileNo,
          email:    booking.customerId?.email,
        },
        vehicle: {
          registrationNo: booking.vehicleId?.registrationNo,
          brand:          booking.vehicleId?.brand,
          model:          booking.vehicleId?.model,
          category:       booking.vehicleId?.category,
        },
        service: {
          name:        booking.serviceName,
          mode:        booking.serviceMode,
          amount:      booking.amount,
          taxAmount:   booking.taxAmount,
          totalAmount: booking.totalAmount,
        },
        jobCard: {
          items:            booking.jobCard?.items || [],
          originalAmount:   booking.jobCard?.originalAmount,
          revisedAmount:    booking.jobCard?.revisedAmount,
          customerApproved: booking.jobCard?.customerApproved,
        },
        payment: {
          mode:          booking.paymentMode,
          status:        booking.paymentStatus,
          paymentId:     booking.paymentId,
          totalAmount:   booking.totalAmount,
          invoiceUrl:    booking.invoiceUrl,
        },
        timeline,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/panel/bookings/:id/status
// @desc    Update booking status (admin override)
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const updateBookingStatus = asyncHandler(async (req, res) => {
  const Booking = require("../models/booking.model");
  const { status, reason } = req.body || {};

  const validStatuses = [
    "pending", "confirmed", "assigned",
    "in_transit", "started", "completed", "cancelled",
  ];

  if (!validStatuses.includes(status)) {
    return errorResponse(
      res,
      `Invalid status. Valid: ${validStatuses.join(", ")}`,
      400
    );
  }

  const updateFields = { status };

  // Set timestamp based on status
  if (status === "assigned")   updateFields.assignedAt   = new Date();
  if (status === "in_transit") updateFields.inTransitAt  = new Date();
  if (status === "started")    updateFields.startedAt    = new Date();
  if (status === "completed")  updateFields.completedAt  = new Date();
  if (status === "cancelled") {
    updateFields.cancelledAt        = new Date();
    updateFields.cancellationReason = reason || "Cancelled by admin";
  }

  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { $set: updateFields },
    { new: true }
  );

  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  return successResponse(
    res,
    "Booking status updated successfully",
    {
      bookingId: booking._id,
      bookingNo: booking.bookingNo,
      status:    booking.status,
    }
  );
});

// ═══════════════════════════════════════════════════════════
// SUPERVISOR MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/supervisors
// @desc    Get all supervisors with details
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getSupervisorList = asyncHandler(async (req, res) => {
  const {
    status, search,
    page = 1, limit = 10,
  } = req.query;

  const filter = { role: "SU", isDeleted: false };
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name:     { $regex: search, $options: "i" } },
      { mobileNo: { $regex: search, $options: "i" } },
    ];
  }

  const [supervisors, total] = await Promise.all([
    User.find(filter)
      .select("-sessionToken -password -__v")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  const Subscription = require("../models/subscription.model");

  // Enrich with counts
  const enriched = await Promise.all(
    supervisors.map(async (s) => {
      const [
        apartmentCount,
        cleanerCount,
        customerCount,
      ] = await Promise.all([
        Subscription.distinct("apartmentId", {
          supervisorId: s._id,
          status:       "active",
          isDeleted:    false,
        }),
        Subscription.distinct("cleanerId", {
          supervisorId: s._id,
          status:       "active",
          isDeleted:    false,
        }),
        Subscription.countDocuments({
          supervisorId: s._id,
          status:       "active",
          isDeleted:    false,
        }),
      ]);

      return {
        ...s.toObject(),
        apartmentsCount: apartmentCount.length,
        cleanersCount:   cleanerCount.length,
        customersCount:  customerCount,
      };
    })
  );

  return successResponse(
    res,
    "Supervisors fetched successfully",
    {
      total,
      page:        parseInt(page),
      totalPages:  Math.ceil(total / parseInt(limit)),
      supervisors: enriched,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/supervisors/:id
// @desc    Get supervisor full profile with all tabs
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getSupervisorDetails = asyncHandler(async (req, res) => {
  const Subscription = require("../models/subscription.model");
  const WorkSession  = require("../models/workSession.model");
  const Inventory    = require("../models/inventory.model");
  const QRStock      = require("../models/qrStock.model");

  const supervisor = await User.findOne({
    _id:       req.params.id,
    role:      "SU",
    isDeleted: false,
  }).select("-sessionToken -password");

  if (!supervisor) {
    return errorResponse(res, "Supervisor not found", 404);
  }

  const [
    allocatedApartments,
    allocatedCleaners,
    qrStock,
    inventory,
    recentApprovals,
  ] = await Promise.all([
    Subscription.find({
      supervisorId: supervisor._id,
      status:       "active",
      isDeleted:    false,
    })
      .distinct("apartmentId"),
    Subscription.find({
      supervisorId: supervisor._id,
      status:       "active",
      isDeleted:    false,
    })
      .distinct("cleanerId"),
    QRStock.find({
      supervisorId: supervisor._id,
      isDeleted:    false,
    }),
    Inventory.find({
      supervisorId: supervisor._id,
      isDeleted:    false,
    }),
    WorkSession.find({
      supervisorId: supervisor._id,
      status:       { $in: ["approved", "rejected_by_supervisor", "redo"] },
      isDeleted:    false,
    })
      .populate("cleanerId", "name")
      .sort({ updatedAt: -1 })
      .limit(20),
  ]);

  // QR stock summary
  const qrSummary = {
    total:     qrStock.length,
    available: qrStock.filter(q => q.status === "available").length,
    allocated: qrStock.filter(q => q.status === "allocated").length,
    damaged:   qrStock.filter(q => q.status === "damaged").length,
  };

  return successResponse(
    res,
    "Supervisor details fetched successfully",
    {
      supervisor,
      tabs: {
        apartmentAllocation: {
          count:        allocatedApartments.length,
          apartmentIds: allocatedApartments,
        },
        cleanerAllocation: {
          count:      allocatedCleaners.length,
          cleanerIds: allocatedCleaners,
        },
        qrStock:     qrSummary,
        inventory:   inventory,
        workApprovalHistory: recentApprovals,
      },
    }
  );
});

// ═══════════════════════════════════════════════════════════
// NCSP MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/ncsp
// @desc    Get all NCSP partners
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getNCSPList = asyncHandler(async (req, res) => {
  const NCSPProfile = require("../models/ncspProfile.model");
  const {
    status, search,
    page = 1, limit = 10,
  } = req.query;

  const filter = { role: "NC", isDeleted: false };
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name:     { $regex: search, $options: "i" } },
      { mobileNo: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-sessionToken -password -__v")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  // Enrich with profile
  const Lead = require("../models/lead.model");
  const enriched = await Promise.all(
    users.map(async (u) => {
      const [profile, leadCount] = await Promise.all([
        NCSPProfile.findOne({
          userId:    u._id,
          isDeleted: false,
        }).select("businessName gstNo appStatus services"),
        Lead.countDocuments({
          providerId: u._id,
          isDeleted:  false,
        }),
      ]);

      return {
        ...u.toObject(),
        businessName:  profile?.businessName || "",
        gstNo:         profile?.gstNo        || "",
        appStatus:     profile?.appStatus    || "inactive",
        servicesCount: profile?.services?.length || 0,
        totalLeads:    leadCount,
      };
    })
  );

  return successResponse(
    res,
    "NCSP list fetched successfully",
    {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      ncspList:   enriched,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/ncsp/:id
// @desc    Get NCSP full details with all tabs
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getNCSPDetails = asyncHandler(async (req, res) => {
  const NCSPProfile = require("../models/ncspProfile.model");
  const Lead        = require("../models/lead.model");
  const Payment     = require("../models/payment.model");

  const user = await User.findOne({
    _id:       req.params.id,
    role:      "NC",
    isDeleted: false,
  }).select("-sessionToken -password");

  if (!user) {
    return errorResponse(res, "NCSP not found", 404);
  }

  const [profile, leads, payments] = await Promise.all([
    NCSPProfile.findOne({
      userId:    user._id,
      isDeleted: false,
    }),
    Lead.find({
      providerId: user._id,
      isDeleted:  false,
    })
      .populate("customerId", "name mobileNo")
      .sort({ createdAt: -1 })
      .limit(20),
    Payment.find({
      customerId: user._id,
      isDeleted:  false,
    }).sort({ createdAt: -1 }).limit(10),
  ]);

  return successResponse(
    res,
    "NCSP details fetched successfully",
    {
      user,
      tabs: {
        businessDetails: profile,
        gstVerification: {
          gstNo:      profile?.gstNo,
          isVerified: profile?.gstNo ? true : false,
        },
        services: profile?.services || [],
        pricing:  profile?.services?.map((s) => ({
          serviceName: s.serviceName,
          pricing:     s.pricing,
        })) || [],
        leads,
        payments,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/panel/ncsp/:id/app-status
// @desc    Toggle NCSP app visibility
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
// const updateNCSPAppStatus = asyncHandler(async (req, res) => {
//   const NCSPProfile = require("../models/ncspProfile.model");
//   const { appStatus } = req.body || {};

//   const profile = await NCSPProfile.findOneAndUpdate(
//     { userId: req.params.id, isDeleted: false },
//     { $set: { appStatus } },
//     { new: true }
//   );

//   if (!profile) {
//     return errorResponse(res, "NCSP profile not found", 404);
//   }

//   return successResponse(
//     res,
//     `NCSP app status updated to ${appStatus}`,
//     { appStatus: profile.appStatus }
//   );
// });

const updateNCSPAppStatus = asyncHandler(async (req, res) => {
  const NCSPProfile = require("../models/ncspProfile.model");
  const { appStatus } = req.body || {};

  if (!["active", "inactive", "suspended"].includes(appStatus)) {
    return errorResponse(
      res,
      "appStatus must be active, inactive or suspended",
      400
    );
  }

  // Try to update existing profile
  let profile = await NCSPProfile.findOneAndUpdate(
    { userId: req.params.id, isDeleted: false },
    { $set: { appStatus } },
    { new: true }
  );

  // If no profile — create basic one
  if (!profile) {
    profile = await NCSPProfile.create({
      userId:    req.params.id,
      appStatus,
      isDeleted: false,
    });
  }

  // Also update user status
  await User.findByIdAndUpdate(req.params.id, {
    $set: {
      status: appStatus === "active" ? "active" : "inactive",
    },
  });

  return successResponse(
    res,
    `NCSP app status updated to ${appStatus}`,
    {
      userId:    req.params.id,
      appStatus: profile.appStatus,
    }
  );
});


// ═══════════════════════════════════════════════════════════
// FRANCHISE MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/franchises
// @desc    Get all franchisees
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getFranchiseList = asyncHandler(async (req, res) => {
  const FranchiseeProfile = require("../models/franchiseeProfile.model");
  const {
    status, franchiseType,
    search, page = 1, limit = 10,
  } = req.query;

  const filter = {
    role:      { $in: ["FR", "FS"] },
    isDeleted: false,
  };
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name:     { $regex: search, $options: "i" } },
      { mobileNo: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-sessionToken -password -__v")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  const Booking = require("../models/booking.model");

  // Enrich with profile
  const enriched = await Promise.all(
    users.map(async (u) => {
      const [profile, bookingCount, revenue] = await Promise.all([
        FranchiseeProfile.findOne({
          userId:    u._id,
          isDeleted: false,
        }).select(
          "businessName franchiseType appStatus " +
          "businessAddress services"
        ),
        Booking.countDocuments({
          franchiseId: u._id,
          isDeleted:   false,
        }),
        Booking.aggregate([
          {
            $match: {
              franchiseId:   u._id,
              paymentStatus: "success",
              isDeleted:     false,
            },
          },
          {
            $group: {
              _id:   null,
              total: { $sum: "$totalAmount" },
            },
          },
        ]),
      ]);

      return {
        ...u.toObject(),
        businessName:  profile?.businessName   || "",
        franchiseType: profile?.franchiseType  || "",
        appStatus:     profile?.appStatus      || "inactive",
        location:      profile?.businessAddress || {},
        bookingCount,
        totalRevenue:  revenue[0]?.total || 0,
      };
    })
  );

  return successResponse(
    res,
    "Franchise list fetched successfully",
    {
      total,
      page:          parseInt(page),
      totalPages:    Math.ceil(total / parseInt(limit)),
      franchiseList: enriched,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/franchises/:id
// @desc    Get franchise full details with all tabs
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getFranchiseDetails = asyncHandler(async (req, res) => {
  const FranchiseeProfile = require("../models/franchiseeProfile.model");
  const Booking           = require("../models/booking.model");
  const Wallet            = require("../models/wallet.model");

  const user = await User.findOne({
    _id:       req.params.id,
    role:      { $in: ["FR", "FS"] },
    isDeleted: false,
  }).select("-sessionToken -password");

  if (!user) {
    return errorResponse(res, "Franchise not found", 404);
  }

  const [profile, bookings, wallet] = await Promise.all([
    FranchiseeProfile.findOne({
      userId:    user._id,
      isDeleted: false,
    }),
    Booking.find({
      franchiseId: user._id,
      isDeleted:   false,
    })
      .populate("customerId", "name mobileNo")
      .populate("serviceId",  "name")
      .sort({ createdAt: -1 })
      .limit(20),
    Wallet.findOne({ userId: user._id }),
  ]);

  // Revenue summary
  const revenue = bookings
    .filter((b) => b.paymentStatus === "success")
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  return successResponse(
    res,
    "Franchise details fetched successfully",
    {
      user,
      tabs: {
        profile,
        bookings: {
          total:   bookings.length,
          revenue,
          list:    bookings,
        },
        jobCards: bookings
          .filter((b) => b.jobCard?.items?.length > 0)
          .map((b) => ({
            bookingNo: b.bookingNo,
            jobCard:   b.jobCard,
          })),
        wallet: {
          balance: wallet?.balance || 0,
          ledger:  wallet?.ledger  || [],
        },
        ratings: bookings
          .filter((b) => b.rating?.stars)
          .map((b) => ({
            bookingNo: b.bookingNo,
            rating:    b.rating,
          })),
        payments: bookings.map((b) => ({
          bookingNo:     b.bookingNo,
          amount:        b.totalAmount,
          paymentStatus: b.paymentStatus,
          paymentMode:   b.paymentMode,
          date:          b.createdAt,
        })),
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/panel/franchises/:id/app-status
// @desc    Toggle franchise app visibility
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
// const updateFranchiseAppStatus = asyncHandler(async (req, res) => {
//   const FranchiseeProfile = require("../models/franchiseeProfile.model");
//   const { appStatus } = req.body || {};

//   const profile = await FranchiseeProfile.findOneAndUpdate(
//     { userId: req.params.id, isDeleted: false },
//     { $set: { appStatus } },
//     { new: true }
//   );

//   if (!profile) {
//     return errorResponse(res, "Franchise profile not found", 404);
//   }

//   return successResponse(
//     res,
//     `Franchise app status updated to ${appStatus}`,
//     { appStatus: profile.appStatus }
//   );
// });

const updateFranchiseAppStatus = asyncHandler(async (req, res) => {
  const FranchiseeProfile = require("../models/franchiseeProfile.model");
  const { appStatus } = req.body || {};

  if (!["active", "inactive", "suspended"].includes(appStatus)) {
    return errorResponse(
      res,
      "appStatus must be active, inactive or suspended",
      400
    );
  }

  // Try to update existing profile
  let profile = await FranchiseeProfile.findOneAndUpdate(
    { userId: req.params.id, isDeleted: false },
    { $set: { appStatus } },
    { new: true }
  );

  // If no profile — create basic one
  if (!profile) {
    profile = await FranchiseeProfile.create({
      userId:    req.params.id,
      appStatus,
      isDeleted: false,
    });
  }

  // Also update user status
  await User.findByIdAndUpdate(req.params.id, {
    $set: {
      status: appStatus === "active" ? "active" : "inactive",
    },
  });

  return successResponse(
    res,
    `Franchise app status updated to ${appStatus}`,
    {
      userId:    req.params.id,
      appStatus: profile.appStatus,
    }
  );
});


// ═══════════════════════════════════════════════════════════
// OPERATIONS TEAM MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/operations
// @desc    Get all operations team members
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getOperationsList = asyncHandler(async (req, res) => {
  const {
    status, page = 1, limit = 10,
  } = req.query;

  const filter = { role: "OT", isDeleted: false };
  if (status) filter.status = status;

  const [members, total] = await Promise.all([
    User.find(filter)
      .select("-sessionToken -password -__v")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  return successResponse(
    res,
    "Operations team fetched successfully",
    {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      members,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/admin/panel/operations/create
// @desc    Create operations team member
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const createOperationsMember = asyncHandler(async (req, res) => {
  const bcrypt = require("bcryptjs");
  const {
    mobileNo, name, email, password,
  } = req.body || {};

  if (!mobileNo || !name || !password) {
    return errorResponse(
      res,
      "Mobile, name and password are required",
      400
    );
  }

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
  const count    = await User.countDocuments({ role: "OT" });
  const partnerId = `OT-${String(count + 1).padStart(5, "0")}`;

  const hashedPassword = await bcrypt.hash(password, 10);

  const member = await User.create({
    mobileNo,
    name,
    email,
    role:        "OT",
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
    "Operations team member created successfully",
    {
      member: {
        _id:       member._id,
        name:      member.name,
        mobileNo:  member.mobileNo,
        partnerId: member.partnerId,
        role:      member.role,
        status:    member.status,
      },
    }
  );
});

// ═══════════════════════════════════════════════════════════
// SERVICE MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/services
// @desc    Get all services in catalog
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getAdminServices = asyncHandler(async (req, res) => {
  const Service = require("../models/service.model");
  const {
    serviceType, isActive,
  } = req.query;

  const filter = { isDeleted: false };
  if (serviceType)         filter.serviceType = serviceType;
  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  const services = await Service.find(filter)
    .sort({ sortOrder: 1 });

  return successResponse(
    res,
    "Services fetched successfully",
    {
      count: services.length,
      services,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/panel/services/:id
// @desc    Update service details
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const updateAdminService = asyncHandler(async (req, res) => {
  const Service = require("../models/service.model");

  const service = await Service.findByIdAndUpdate(
    req.params.id,
    { $set: req.body || {} },
    { new: true, runValidators: true }
  );

  if (!service) {
    return errorResponse(res, "Service not found", 404);
  }

  return successResponse(
    res,
    "Service updated successfully",
    { service }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/panel/services/:id/toggle
// @desc    Activate or deactivate service
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const toggleService = asyncHandler(async (req, res) => {
  const Service = require("../models/service.model");

  const service = await Service.findById(req.params.id);

  if (!service) {
    return errorResponse(res, "Service not found", 404);
  }

  service.isActive = !service.isActive;
  await service.save();

  return successResponse(
    res,
    `Service ${service.isActive ? "activated" : "deactivated"} successfully`,
    {
      serviceId: service._id,
      name:      service.name,
      isActive:  service.isActive,
    }
  );
});

// ═══════════════════════════════════════════════════════════
// SETTINGS MODULE
// ═══════════════════════════════════════════════════════════

// In-memory settings store
// Will be replaced with DB in Phase 14
let appSettings = {
  general: {
    appName:        "GoMotorCar",
    supportEmail:   "support@gomotorcar.com",
    supportPhone:   "9742977577",
    helplineNo:     "9742977577",
  },
  commission: {
    bookingCommissionPercent: 10,
    ncspLeadCostMonthly:      999,
    ncspLeadCostAnnual:       9999,
  },
  gst: {
    gstPercent:  18,
    gstNo:       "",
    companyName: "GoMotorCar Pvt Ltd",
  },
  payment: {
    razorpayKeyId:  "",
    razorpaySecret: "",
    walletEnabled:  true,
    minWalletTopup: 100,
    maxWalletLimit: 50000,
  },
  notifications: {
    smsEnabled:   true,
    emailEnabled: true,
    pushEnabled:  true,
  },
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/settings
// @desc    Get all settings
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getSettings = asyncHandler(async (req, res) => {
  // Hide sensitive keys in response
  const safeSettings = {
    ...appSettings,
    payment: {
      ...appSettings.payment,
      razorpaySecret: appSettings.payment.razorpaySecret
        ? "***configured***"
        : "not configured",
    },
  };

  return successResponse(
    res,
    "Settings fetched successfully",
    { settings: safeSettings }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/panel/settings
// @desc    Update settings
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const updateSettings = asyncHandler(async (req, res) => {
  const { section, data } = req.body || {};

  const validSections = [
    "general", "commission", "gst",
    "payment", "notifications",
  ];

  if (!validSections.includes(section)) {
    return errorResponse(
      res,
      `Invalid section. Valid: ${validSections.join(", ")}`,
      400
    );
  }

  // Merge settings
  appSettings[section] = {
    ...appSettings[section],
    ...data,
  };

  return successResponse(
    res,
    `${section} settings updated successfully`,
    { settings: appSettings[section] }
  );
});

// ═══════════════════════════════════════════════════════════
// ADMIN USER MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/admin-users
// @desc    Get all admin users
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getAdminUsers = asyncHandler(async (req, res) => {
  const adminUsers = await User.find({
    role:      { $in: ["IT", "SU", "OT"] },
    isDeleted: false,
  })
    .select("-sessionToken -password -__v")
    .sort({ createdAt: -1 });

  // Group by role
  const grouped = {
    superAdmin:        adminUsers.filter(u => u.role === "IT"),
    supervisors:       adminUsers.filter(u => u.role === "SU"),
    operationsTeam:    adminUsers.filter(u => u.role === "OT"),
  };

  return successResponse(
    res,
    "Admin users fetched successfully",
    {
      total:   adminUsers.length,
      grouped,
      users:   adminUsers,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/panel/admin-users/:id/status
// @desc    Activate or deactivate admin user
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const updateAdminUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body || {};

  if (!["active", "inactive"].includes(status)) {
    return errorResponse(
      res,
      "Status must be active or inactive",
      400
    );
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true }
  ).select("-sessionToken -password");

  if (!user) {
    return errorResponse(res, "User not found", 404);
  }

  return successResponse(
    res,
    `Admin user ${status === "active" ? "activated" : "deactivated"} successfully`,
    { user }
  );
});

// ═══════════════════════════════════════════════════════════
// INVENTORY MANAGEMENT (ADMIN VIEW)
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/panel/inventory
// @desc    Get all inventory records
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const getAdminInventory = asyncHandler(async (req, res) => {
  const Inventory = require("../models/inventory.model");
  const {
    status, page = 1, limit = 10,
  } = req.query;

  const filter = { isDeleted: false };
  if (status) filter.status = status;

  const [inventory, total] = await Promise.all([
    Inventory.find(filter)
      .populate("cleanerId",    "name mobileNo partnerId")
      .populate("supervisorId", "name mobileNo partnerId")
      .sort({ allocatedAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Inventory.countDocuments(filter),
  ]);

  // Summary
  const summary = {
    total:    await Inventory.countDocuments({ isDeleted: false }),
    pending:  await Inventory.countDocuments({ status: "pending",  isDeleted: false }),
    accepted: await Inventory.countDocuments({ status: "accepted", isDeleted: false }),
    rejected: await Inventory.countDocuments({ status: "rejected", isDeleted: false }),
  };

  return successResponse(
    res,
    "Inventory fetched successfully",
    {
      summary,
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      inventory,
    }
  );
});



module.exports = {
  // Dashboard
  getDashboard,
  
  // Banners
  createBanner,
  getBanners,
  getActiveBanners,
  updateBanner,
  deleteBanner,
  // Policies

  upsertPolicy,
  getPolicies,
  // QR Codes

  generateQRBatch,
  getQRCodes,
  assignQRToSupervisor,
  // Reports

  getSubscriptionsReport,
  getBookingsReport,
  getRevenueReport,
  getGrievancesReport,

  // Website Queries
  submitWebsiteQuery,
  getWebsiteQueries,
  respondToQuery,

  // Apartments
  createApartment,
  getApartments,
  updateApartment,
  assignSupervisorToApartment,

  // Coupons
  createCoupon,
  getCoupons,
  validateCoupon,
  updateCoupon,
  deleteCoupon,

  // Notifications
  broadcastNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,

  // Customer Management
  getCustomers,
  getCustomerDetails,
  suspendCustomer,
  activateCustomer,

   // Subscription Management
  getAdminSubscriptions,
  adminAssignCleaner,
  adminChangeSupervisor,
  adminCancelSubscription,

   // Cleaner Management
  getCleanerList,
  getCleanerFullProfile,

  // Grievance Management
  getAllGrievances,
  resolveGrievance,
  escalateGrievance,
  addGrievanceMessage,

    // Lead Management
  getAllLeads,
  // Payment Management
  getAllPayments,
  getWalletTransactions,
  // Audit Logs
  getAuditLogs,

   // Booking Management
  getAdminBookings,
  getAdminBookingDetails,
  updateBookingStatus,
  // Supervisor Management
  getSupervisorList,
  getSupervisorDetails,
  // NCSP Management
  getNCSPList,
  getNCSPDetails,
  updateNCSPAppStatus,
  // Franchise Management
  getFranchiseList,
  getFranchiseDetails,
  updateFranchiseAppStatus,
  // Operations Team
  getOperationsList,
  createOperationsMember,
  // Service Management
  getAdminServices,
  updateAdminService,
  toggleService,
  // Settings
  getSettings,
  updateSettings,
  // Admin Users
  getAdminUsers,
  updateAdminUserStatus,
  // Inventory
  getAdminInventory,

};