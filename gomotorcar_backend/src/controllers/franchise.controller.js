const FranchiseeProfile = require("../models/franchiseeProfile.model");
const Booking           = require("../models/booking.model");
const Slot              = require("../models/slot.model");
const Wallet            = require("../models/wallet.model");
const User              = require("../models/user.model");
const asyncHandler      = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");

// ═══════════════════════════════════════════════════════════
// 1. PROFILE + REGISTRATION
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/franchise/profile
// @desc    Get franchise own profile
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const getProfile = asyncHandler(async (req, res) => {
  const profile = await FranchiseeProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  });

  if (!profile) {
    return errorResponse(
      res,
      "Profile not found. Please complete registration.",
      404
    );
  }

  return successResponse(
    res,
    "Profile fetched successfully",
    { profile }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/franchise/profile
// @desc    Update franchise profile
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const {
    businessName, ownerName,
    contactPersonName, contactPersonMobile,
    businessEmail, businessAddress,
    businessImages, logoImage,
    bankDetails,
  } = req.body || {};

  const profile = await FranchiseeProfile.findOneAndUpdate(
    { userId: req.user._id, isDeleted: false },
    {
      $set: {
        businessName,
        ownerName,
        contactPersonName,
        contactPersonMobile,
        businessEmail,
        businessAddress,
        businessImages,
        logoImage,
        bankDetails,
      },
    },
    { new: true, runValidators: false }
  );

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  return successResponse(
    res,
    "Profile updated successfully",
    { profile }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/franchise/services
// @desc    Add service to franchise listing
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const addService = asyncHandler(async (req, res) => {
  const { serviceName, serviceMode, pricing } = req.body || {};

  if (!serviceName) {
    return errorResponse(res, "Service name is required", 400);
  }

  const profile = await FranchiseeProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  });

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  // Check duplicate
  const existing = profile.services.find(
    (s) => s.serviceName.toLowerCase() ===
      serviceName.toLowerCase()
  );

  if (existing) {
    return errorResponse(
      res,
      "Service already added",
      409
    );
  }

  profile.services.push({
    serviceName,
    serviceMode: serviceMode || "at_works",
    pricing:     pricing     || {},
  });

  await profile.save();

  return createdResponse(
    res,
    "Service added successfully",
    { services: profile.services }
  );
});

// ─────────────────────────────────────────────────────────
// @route   DELETE /api/franchise/services/:serviceId
// @desc    Remove service from listing
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const removeService = asyncHandler(async (req, res) => {
  const profile = await FranchiseeProfile.findOneAndUpdate(
    { userId: req.user._id, isDeleted: false },
    {
      $pull: {
        services: { _id: req.params.serviceId },
      },
    },
    { new: true }
  );

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  return successResponse(
    res,
    "Service removed successfully",
    { services: profile.services }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/franchise/pricing
// @desc    Update service pricing matrix
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const updatePricing = asyncHandler(async (req, res) => {
  const { serviceId, pricing } = req.body || {};

  if (!serviceId || !pricing) {
    return errorResponse(
      res,
      "Service ID and pricing are required",
      400
    );
  }

  const profile = await FranchiseeProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  });

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  const serviceIndex = profile.services.findIndex(
    (s) => s._id.toString() === serviceId
  );

  if (serviceIndex === -1) {
    return errorResponse(
      res,
      "Service not found in your listing",
      404
    );
  }

  profile.services[serviceIndex].pricing = pricing;
  await profile.save();

  return successResponse(
    res,
    "Pricing updated successfully",
    { services: profile.services }
  );
});

// ═══════════════════════════════════════════════════════════
// 2. BOOKING MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/franchise/bookings
// @desc    Get all bookings for franchise
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const getBookings = asyncHandler(async (req, res) => {
  const {
    status, page = 1, limit = 10,
    from, to,
  } = req.query;

  const filter = {
    franchiseId: req.user._id,
    isDeleted:   false,
  };

  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("customerId",  "name mobileNo")
      .populate("serviceId",   "name")
      .populate("vehicleId",   "registrationNo brand model category")
      .populate("customerAddressId", "line1 city pinCode")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Booking.countDocuments(filter),
  ]);

  // Summary counts
  const summary = {
    new:        await Booking.countDocuments({ franchiseId: req.user._id, status: "pending",   isDeleted: false }),
    confirmed:  await Booking.countDocuments({ franchiseId: req.user._id, status: "confirmed", isDeleted: false }),
    inProgress: await Booking.countDocuments({ franchiseId: req.user._id, status: "started",   isDeleted: false }),
    completed:  await Booking.countDocuments({ franchiseId: req.user._id, status: "completed", isDeleted: false }),
    cancelled:  await Booking.countDocuments({ franchiseId: req.user._id, status: "cancelled", isDeleted: false }),
  };

  return successResponse(
    res,
    "Bookings fetched successfully",
    {
      summary,
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      bookings,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/franchise/bookings/:id
// @desc    Get single booking details
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id:         req.params.id,
    franchiseId: req.user._id,
    isDeleted:   false,
  })
    .populate("customerId",        "name mobileNo email profilePic")
    .populate("serviceId",         "name description")
    .populate("vehicleId",         "registrationNo brand model color category")
    .populate("customerAddressId", "line1 landmark city state pinCode");

  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  return successResponse(
    res,
    "Booking details fetched successfully",
    { booking }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/franchise/bookings/:id/respond
// @desc    Accept, Reject or Hold a booking
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const respondToBooking = asyncHandler(async (req, res) => {
  const { action, reason, holdTill } = req.body || {};
  // action = "ACCEPT" | "REJECT" | "HOLD"

  const validActions = ["ACCEPT", "REJECT", "HOLD"];
  if (!validActions.includes(action)) {
    return errorResponse(
      res,
      `Invalid action. Valid: ${validActions.join(", ")}`,
      400
    );
  }

  const booking = await Booking.findOne({
    _id:         req.params.id,
    franchiseId: req.user._id,
    status:      "pending",
    isDeleted:   false,
  });

  if (!booking) {
    return errorResponse(
      res,
      "Booking not found or already responded",
      404
    );
  }

  let newStatus;
  let updateFields = {};

  if (action === "ACCEPT") {
    newStatus = "confirmed";
    updateFields.assignedAt = new Date();
  } else if (action === "REJECT") {
    newStatus = "cancelled";
    updateFields.cancelledAt        = new Date();
    updateFields.cancellationReason = reason || "Rejected by franchise";
    updateFields.franchiseResponse  = "rejected";
    // Free up slot
    if (booking.slotId) {
      await Slot.findByIdAndUpdate(booking.slotId, {
        $set: { isBooked: false, bookingId: null },
      });
    }
  } else {
    // HOLD
    newStatus = "pending";
    updateFields.holdTill          = holdTill ? new Date(holdTill) : null;
    updateFields.franchiseResponse = "hold";
  }

  await Booking.findByIdAndUpdate(booking._id, {
    $set: {
      status:            newStatus,
      franchiseResponse: action.toLowerCase(),
      rejectionReason:   reason || null,
      ...updateFields,
    },
  });

  return successResponse(
    res,
    `Booking ${action.toLowerCase()}ed successfully`,
    {
      bookingId: booking._id,
      bookingNo: booking.bookingNo,
      action,
      status:    newStatus,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/franchise/bookings/:id/status
// @desc    Update booking progress status
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body || {};

  const validStatuses = [
    "assigned", "in_transit", "started", "completed",
  ];

  if (!validStatuses.includes(status)) {
    return errorResponse(
      res,
      `Invalid status. Valid: ${validStatuses.join(", ")}`,
      400
    );
  }

  const booking = await Booking.findOne({
    _id:         req.params.id,
    franchiseId: req.user._id,
    isDeleted:   false,
  });

  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  const updateFields = { status };

  // Timestamp tracking
  if (status === "assigned")   updateFields.assignedAt   = new Date();
  if (status === "in_transit") updateFields.inTransitAt  = new Date();
  if (status === "started")    updateFields.startedAt    = new Date();
  if (status === "completed") {
    updateFields.completedAt = new Date();
    // Credit franchise wallet on completion
    await creditFranchiseWallet(
      req.user._id,
      booking._id,
      booking.totalAmount
    );
  }

  await Booking.findByIdAndUpdate(booking._id, {
    $set: updateFields,
  });

  return successResponse(
    res,
    `Booking status updated to ${status}`,
    {
      bookingId: booking._id,
      bookingNo: booking.bookingNo,
      status,
    }
  );
});

// ─────────────────────────────────────────────────────────
// HELPER: Credit franchise wallet after completion
// ─────────────────────────────────────────────────────────
const creditFranchiseWallet = async (
  franchiseId,
  bookingId,
  amount
) => {
  // Commission deduction (10%)
  const commission  = Math.round(amount * 0.10);
  const netAmount   = amount - commission;

  let wallet = await Wallet.findOne({ userId: franchiseId });

  if (!wallet) {
    wallet = await Wallet.create({
      userId:  franchiseId,
      balance: 0,
    });
  }

  const newBalance = wallet.balance + netAmount;

  await Wallet.findByIdAndUpdate(wallet._id, {
    $set:  { balance: newBalance },
    $push: {
      ledger: {
        type:        "credit",
        amount:      netAmount,
        purpose:     "booking_payment",
        referenceId: bookingId,
        description: `Booking payment (after 10% commission deduction)`,
        balanceAfter:newBalance,
      },
    },
  });
};

// ═══════════════════════════════════════════════════════════
// 3. JOB CARD MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   POST /api/franchise/bookings/:id/jobcard
// @desc    Add/modify job card items
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const modifyJobCard = asyncHandler(async (req, res) => {
  const { items, notes } = req.body || {};
  // items = [{ description, quantity, unitPrice, warrantyDays }]

  if (!items || !Array.isArray(items)) {
    return errorResponse(res, "Items array is required", 400);
  }

  const booking = await Booking.findOne({
    _id:         req.params.id,
    franchiseId: req.user._id,
    isDeleted:   false,
  });

  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  // Calculate totals
  const processedItems = items.map((item) => ({
    description:  item.description,
    quantity:     item.quantity  || 1,
    unitPrice:    item.unitPrice,
    totalPrice:   (item.quantity || 1) * item.unitPrice,
    warrantyDays: item.warrantyDays || 0,
    warrantyNote: item.warrantyNote || "",
  }));

  const revisedAmount = processedItems.reduce(
    (sum, item) => sum + item.totalPrice, 0
  );

  // New tax calculation
  const newTaxAmount   = Math.round(revisedAmount * 0.18);
  const newTotalAmount = revisedAmount + newTaxAmount;

  await Booking.findByIdAndUpdate(booking._id, {
    $set: {
      "jobCard.items":            processedItems,
      "jobCard.originalAmount":   booking.amount,
      "jobCard.revisedAmount":    revisedAmount,
      "jobCard.notes":            notes || "",
      "jobCard.customerApproved": false,
      taxAmount:                  newTaxAmount,
      totalAmount:                newTotalAmount,
    },
  });

  return successResponse(
    res,
    "Job card updated successfully. Customer approval pending.",
    {
      bookingId:      booking._id,
      originalAmount: booking.amount,
      revisedAmount,
      taxAmount:      newTaxAmount,
      totalAmount:    newTotalAmount,
      items:          processedItems,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/franchise/bookings/:id/jobcard/warranty
// @desc    Add warranty to job card items
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const addWarranty = asyncHandler(async (req, res) => {
  const { warranties } = req.body || {};
  // warranties = [{ itemIndex, warrantyDays, warrantyNote }]

  const booking = await Booking.findOne({
    _id:         req.params.id,
    franchiseId: req.user._id,
    isDeleted:   false,
  });

  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  if (!booking.jobCard || !booking.jobCard.items.length) {
    return errorResponse(
      res,
      "Job card has no items. Add items first.",
      400
    );
  }

  // Update warranty for each item
  const updatedItems = [...booking.jobCard.items];
  warranties.forEach(({ itemIndex, warrantyDays, warrantyNote }) => {
    if (updatedItems[itemIndex]) {
      updatedItems[itemIndex].warrantyDays = warrantyDays;
      updatedItems[itemIndex].warrantyNote = warrantyNote || "";
    }
  });

  await Booking.findByIdAndUpdate(booking._id, {
    $set: { "jobCard.items": updatedItems },
  });

  return successResponse(
    res,
    "Warranty added successfully. Will appear on invoice.",
    { items: updatedItems }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/franchise/bookings/:id/close
// @desc    Close booking after payment and handover
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const closeBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id:         req.params.id,
    franchiseId: req.user._id,
    isDeleted:   false,
  });

  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  if (booking.status === "cancelled") {
    return errorResponse(
      res,
      "Cannot close a cancelled booking",
      400
    );
  }

  await Booking.findByIdAndUpdate(booking._id, {
    $set: {
      status:      "completed",
      completedAt: new Date(),
    },
  });

  // Credit wallet
  await creditFranchiseWallet(
    req.user._id,
    booking._id,
    booking.totalAmount
  );

  return successResponse(
    res,
    "Booking closed successfully. Invoice generated. Rating prompt sent to customer.",
    {
      bookingId: booking._id,
      bookingNo: booking.bookingNo,
      status:    "completed",
    }
  );
});

// ═══════════════════════════════════════════════════════════
// 4. ORDER SUMMARY
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/franchise/order-summary
// @desc    Get order summary daily/monthly/annual
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const getOrderSummary = asyncHandler(async (req, res) => {
  const { period = "monthly" } = req.query;

  const now   = new Date();
  let start;

  if (period === "daily") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (period === "annual") {
    start = new Date(now);
    start.setFullYear(now.getFullYear() - 1);
  } else {
    // Monthly
    start = new Date(now);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  const bookings = await Booking.find({
    franchiseId: req.user._id,
    createdAt:   { $gte: start, $lte: now },
    isDeleted:   false,
  });

  const total      = bookings.length;
  const completed  = bookings.filter(b => b.status === "completed").length;
  const cancelled  = bookings.filter(b => b.status === "cancelled").length;
  const pending    = bookings.filter(b => b.status === "pending").length;

  const revenue = bookings
    .filter(b => b.paymentStatus === "success")
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const commission = Math.round(revenue * 0.10);
  const netRevenue = revenue - commission;

  return successResponse(
    res,
    "Order summary fetched successfully",
    {
      period,
      summary: {
        total,
        completed,
        cancelled,
        pending,
        revenue,
        commission,
        netRevenue,
      },
      bookings,
    }
  );
});

// ═══════════════════════════════════════════════════════════
// 5. WALLET
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/franchise/wallet
// @desc    Get wallet balance and ledger
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const getWallet = asyncHandler(async (req, res) => {
  let wallet = await Wallet.findOne({ userId: req.user._id });

  if (!wallet) {
    wallet = await Wallet.create({
      userId:  req.user._id,
      balance: 0,
    });
  }

  return successResponse(
    res,
    "Wallet fetched successfully",
    {
      wallet: {
        _id:     wallet._id,
        balance: wallet.balance,
        ledger:  wallet.ledger.slice(-20).reverse(),
      },
    }
  );
});

// ═══════════════════════════════════════════════════════════
// 6. WORK TIMINGS + SLOTS
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/franchise/timings
// @desc    Get working hours and weekly off
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const getTimings = asyncHandler(async (req, res) => {
  const profile = await FranchiseeProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  }).select("workingHours workingDays weeklyOff");

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  return successResponse(
    res,
    "Timings fetched successfully",
    {
      workingHours: profile.workingHours,
      workingDays:  profile.workingDays,
      weeklyOff:    profile.weeklyOff,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/franchise/timings
// @desc    Update working hours and weekly off
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const updateTimings = asyncHandler(async (req, res) => {
  const { workingHours, workingDays, weeklyOff } = req.body || {};

  const profile = await FranchiseeProfile.findOneAndUpdate(
    { userId: req.user._id, isDeleted: false },
    { $set: { workingHours, workingDays, weeklyOff } },
    { new: true }
  );

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  return successResponse(
    res,
    "Working hours updated successfully",
    {
      workingHours: profile.workingHours,
      workingDays:  profile.workingDays,
      weeklyOff:    profile.weeklyOff,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/franchise/slots
// @desc    Get slots for a specific date
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const getSlots = asyncHandler(async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return errorResponse(res, "Date is required", 400);
  }

  const queryDate  = new Date(date);
  queryDate.setHours(0, 0, 0, 0);
  const nextDay    = new Date(queryDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const slots = await Slot.find({
    franchiseId: req.user._id,
    date:        { $gte: queryDate, $lt: nextDay },
    isDeleted:   false,
  })
    .populate("bookingId", "bookingNo customerId status")
    .sort({ startTime: 1 });

  return successResponse(
    res,
    "Slots fetched successfully",
    {
      date,
      total:     slots.length,
      booked:    slots.filter(s => s.isBooked).length,
      available: slots.filter(s => !s.isBooked && !s.isBlocked).length,
      slots,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/franchise/slots/block
// @desc    Block a slot manually
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const blockSlot = asyncHandler(async (req, res) => {
  const { date, startTime, endTime, reason } = req.body || {};

  if (!date || !startTime || !endTime) {
    return errorResponse(
      res,
      "Date, startTime and endTime are required",
      400
    );
  }

  // Check slot not already booked
  const existing = await Slot.findOne({
    franchiseId: req.user._id,
    date:        new Date(date),
    startTime,
    isBooked:    true,
  });

  if (existing) {
    return errorResponse(
      res,
      "Slot already booked. Cannot block.",
      409
    );
  }

  // Create or update slot as blocked
  const slot = await Slot.findOneAndUpdate(
    {
      franchiseId: req.user._id,
      date:        new Date(date),
      startTime,
    },
    {
      $set: {
        franchiseId: req.user._id,  // ← fixed
        date:      new Date(date),
        startTime,
        endTime,
        isBlocked: true,
        isBooked:  false,
      },
    },
    { upsert: true, new: true }
  );

  return successResponse(
    res,
    "Slot blocked successfully",
    { slot }
  );
});

// ═══════════════════════════════════════════════════════════
// 7. RATINGS
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/franchise/ratings
// @desc    Get ratings and reviews for franchise
// @access  Private (FR/FS role)
// ─────────────────────────────────────────────────────────
const getRatings = asyncHandler(async (req, res) => {
  const ratings = await Booking.find({
    franchiseId: req.user._id,
    "rating.stars": { $exists: true },
    isDeleted:   false,
  })
    .populate("customerId", "name")
    .populate("serviceId",  "name")
    .select("bookingNo rating customerId serviceId completedAt")
    .sort({ completedAt: -1 });

  // Calculate average
  const totalRatings = ratings.length;
  const avgRating    = totalRatings > 0
    ? (
        ratings.reduce((sum, r) => sum + (r.rating?.stars || 0), 0) /
        totalRatings
      ).toFixed(1)
    : 0;

  // Rating breakdown 1-5
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach((r) => {
    if (r.rating?.stars) breakdown[r.rating.stars]++;
  });

  return successResponse(
    res,
    "Ratings fetched successfully",
    {
      summary: {
        totalRatings,
        averageRating: parseFloat(avgRating),
        breakdown,
      },
      ratings: ratings.map((r) => ({
        bookingNo:    r.bookingNo,
        stars:        r.rating?.stars,
        comment:      r.rating?.comment,
        ratedAt:      r.rating?.ratedAt,
        customerName: r.customerId?.name,
        serviceName:  r.serviceId?.name,
      })),
    }
  );
});

module.exports = {
  // Profile
  getProfile,
  updateProfile,
  addService,
  removeService,
  updatePricing,
  // Bookings
  getBookings,
  getBookingById,
  respondToBooking,
  updateBookingStatus,
  closeBooking,
  // Job Card
  modifyJobCard,
  addWarranty,
  // Order Summary
  getOrderSummary,
  // Wallet
  getWallet,
  // Timings + Slots
  getTimings,
  updateTimings,
  getSlots,
  blockSlot,
  // Ratings
  getRatings,
};