const Booking          = require("../models/booking.model");
const Service          = require("../models/service.model");
const Slot             = require("../models/slot.model");
const Vehicle          = require("../models/vehicle.model");
const FranchiseeProfile= require("../models/franchiseeProfile.model");
const asyncHandler     = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");
const { ROLES } = require("../config/constants");

// ─────────────────────────────────────────────────────────
// @route   GET /api/booking/services
// @desc    Get CSP service catalog
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const getServices = asyncHandler(async (req, res) => {
  const { type } = req.query;
  // type = "csp" or "steam"

  const filter = {
    isActive:  true,
    isDeleted: false,
  };

  if (type) filter.serviceType = type;

  const services = await Service.find(filter)
    .sort({ sortOrder: 1 });

  return successResponse(
    res,
    "Services fetched successfully",
    {
      count:    services.length,
      services,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/booking/franchises
// @desc    Get eligible franchises for a service
// @access  Private (Customer)
// Query: serviceId, lat, lng, pin (for steam wash)
// ─────────────────────────────────────────────────────────
const getFranchises = asyncHandler(async (req, res) => {
  const { serviceId, lat, lng, pin } = req.query;

  // Get service details
  const service = await Service.findById(serviceId);
  if (!service) {
    return errorResponse(res, "Service not found", 404);
  }

  let franchises;

  if (service.serviceType === "steam") {
    // Steam Car Wash — Pin code based search
    if (!pin) {
      return errorResponse(
        res,
        "Pin code is required for Steam Car Wash",
        400
      );
    }

    franchises = await FranchiseeProfile.find({
      franchiseType:    "steam_wash",
      servicePinCodes:  pin,
      appStatus:        "active",
      isDeleted:        false,
    })
      .populate("userId", "name mobileNo")
      .select(
        "businessName logoImage businessAddress " +
        "services workingHours paymentModes"
      );

  } else {
    // CSP — Geo location based search
    if (!lat || !lng) {
      return errorResponse(
        res,
        "Location (lat, lng) required for CSP services",
        400
      );
    }

    franchises = await FranchiseeProfile.find({
      franchiseType: "csp",
      appStatus:     "active",
      isDeleted:     false,
      location: {
        $near: {
          $geometry: {
            type:        "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: 25000, // 25km max
        },
      },
    })
      .populate("userId", "name mobileNo")
      .select(
        "businessName logoImage businessAddress " +
        "services workingHours paymentModes location"
      );
  }

  // Filter franchises that offer this service
  const filtered = franchises.filter((f) =>
    f.services.some((s) =>
      s.serviceName.toLowerCase().includes(
        service.name.toLowerCase()
      )
    )
  );

  return successResponse(
    res,
    "Franchises fetched successfully",
    {
      count:      filtered.length,
      franchises: filtered,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/booking/slots
// @desc    Get available slots for a franchise
// @access  Private (Customer)
// Query: franchiseId, date
// ─────────────────────────────────────────────────────────
const getSlots = asyncHandler(async (req, res) => {
  const { franchiseId, date } = req.query;

  if (!franchiseId || !date) {
    return errorResponse(
      res,
      "franchiseId and date are required",
      400
    );
  }

  const queryDate  = new Date(date);
  const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
  const endOfDay   = new Date(queryDate.setHours(23, 59, 59, 999));

  // Get franchise working hours
  const franchise = await FranchiseeProfile.findOne({
    userId:    franchiseId,
    isDeleted: false,
  });

  if (!franchise) {
    return errorResponse(res, "Franchise not found", 404);
  }

  // Check if requested date is weekly off
  const dayNames = ["sun","mon","tue","wed","thu","fri","sat"];
  const dayName  = dayNames[new Date(date).getDay()];

  if (franchise.weeklyOff?.includes(dayName)) {
    return errorResponse(
      res,
      "Franchise is closed on this day",
      400
    );
  }

  // Get existing slots for this date
  const slots = await Slot.find({
    franchiseId,
    date: { $gte: startOfDay, $lte: endOfDay },
    isDeleted: false,
    isBlocked: false,
  }).sort({ startTime: 1 });

  // If no slots created yet — generate default slots
  if (slots.length === 0) {
    const openTime  = franchise.workingHours?.openTime  || "09:00";
    const closeTime = franchise.workingHours?.closeTime || "18:00";

    const generatedSlots = generateSlots(
      franchiseId,
      date,
      openTime,
      closeTime
    );

    return successResponse(
      res,
      "Available slots fetched successfully",
      {
        date,
        franchiseId,
        workingHours: franchise.workingHours,
        weeklyOff:    franchise.weeklyOff,
        slots:        generatedSlots,
      }
    );
  }

  const availableSlots = slots.filter((s) => !s.isBooked);

  return successResponse(
    res,
    "Available slots fetched successfully",
    {
      date,
      franchiseId,
      totalSlots:     slots.length,
      availableSlots: availableSlots.length,
      slots,
    }
  );
});

// ─────────────────────────────────────────────────────────
// HELPER: Generate time slots between open and close time
// ─────────────────────────────────────────────────────────
const generateSlots = (franchiseId, date, openTime, closeTime) => {
  const slots   = [];
  const [openH, openM]   = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);

  let currentH = openH;
  let currentM = openM;

  while (
    currentH < closeH ||
    (currentH === closeH && currentM < closeM)
  ) {
    const nextH = currentM + 60 >= 60
      ? currentH + 1
      : currentH;
    const nextM = (currentM + 60) % 60;

    if (
      nextH > closeH ||
      (nextH === closeH && nextM > closeM)
    ) break;

    slots.push({
      franchiseId,
      date,
      startTime: `${String(currentH).padStart(2,"0")}:${String(currentM).padStart(2,"0")}`,
      endTime:   `${String(nextH).padStart(2,"0")}:${String(nextM).padStart(2,"0")}`,
      isBooked:  false,
    });

    currentH = nextH;
    currentM = nextM;
  }

  return slots;
};

// ─────────────────────────────────────────────────────────
// @route   POST /api/booking
// @desc    Create a booking
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const createBooking = asyncHandler(async (req, res) => {
  const {
    franchiseId,
    serviceId,
    vehicleId,
    serviceMode,
    customerAddressId,
    pickupAddress,
    slotId,
    scheduledDate,
    scheduledTime,
    paymentMode,
    paymentType,
  } = req.body;

  // Validate service
  const service = await Service.findById(serviceId);
  if (!service) {
    return errorResponse(res, "Service not found", 404);
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

  // Get price based on vehicle category
  const price = service.pricing[vehicle.category] ||
    service.pricing.sedan || 0;

  // Tax calculation (18% GST)
  const taxAmount   = Math.round(price * 0.18);
  const totalAmount = price + taxAmount;

  // Create booking
  const booking = await Booking.create({
    customerId:       req.user._id,
    franchiseId,
    serviceId,
    serviceName:      service.name,
    vehicleId,
    vehicleCategory:  vehicle.category,
    slotId,
    scheduledDate:    scheduledDate
      ? new Date(scheduledDate)
      : null,
    scheduledTime,
    serviceMode,
    customerAddressId,
    pickupAddress,
    paymentMode:      paymentMode  || "online",
    paymentType:      paymentType  || "pay_after",
    amount:           price,
    taxAmount,
    totalAmount,
    status:           "pending",
    franchiseResponse:"pending",
    jobCard: {
      items:          [],
      originalAmount: price,
      revisedAmount:  price,
    },
  });

  // Mark slot as booked if slotId provided
  if (slotId) {
    await Slot.findByIdAndUpdate(slotId, {
      $set: {
        isBooked:  true,
        bookingId: booking._id,
      },
    });
  }

  return createdResponse(
    res,
    "Booking created successfully. Waiting for franchise confirmation.",
    { booking }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/booking
// @desc    Get all bookings of customer
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const getBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = {
    customerId: req.user._id,
    isDeleted:  false,
  };

  if (status) filter.status = status;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("serviceId",   "name icon")
      .populate("vehicleId",   "registrationNo brand model")
      .populate("franchiseId", "name")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Booking.countDocuments(filter),
  ]);

  return successResponse(
    res,
    "Bookings fetched successfully",
    {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      bookings,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/booking/:id
// @desc    Get single booking details with tracking
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id:        req.params.id,
    customerId: req.user._id,
    isDeleted:  false,
  })
    .populate("serviceId",        "name description icon pricing")
    .populate("vehicleId",        "registrationNo brand model color")
    .populate("franchiseId",      "name mobileNo")
    .populate("customerAddressId","line1 city pinCode");

  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  // Build tracking stages for UI
  // As per UI: Assigned → In Transit → Started → Done
  const stages = [
    {
      stage:     "assigned",
      label:     "Assigned",
      completed: [
        "assigned","in_transit",
        "started","completed"
      ].includes(booking.status),
      timestamp: booking.assignedAt,
    },
    {
      stage:     "in_transit",
      label:     "In Transit",
      completed: [
        "in_transit","started","completed"
      ].includes(booking.status),
      timestamp: booking.inTransitAt,
    },
    {
      stage:     "started",
      label:     "Started",
      completed: [
        "started","completed"
      ].includes(booking.status),
      timestamp: booking.startedAt,
    },
    {
      stage:     "completed",
      label:     "Done",
      completed: booking.status === "completed",
      timestamp: booking.completedAt,
    },
  ];

  return successResponse(
    res,
    "Booking details fetched successfully",
    {
      booking,
      tracking: {
        currentStatus: booking.status,
        stages,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/booking/:id/cancel
// @desc    Cancel a booking
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const booking = await Booking.findOne({
    _id:        req.params.id,
    customerId: req.user._id,
    isDeleted:  false,
  });

  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  // Cannot cancel if already started or completed
  if (
    ["started", "completed", "cancelled"]
      .includes(booking.status)
  ) {
    return errorResponse(
      res,
      `Cannot cancel booking with status: ${booking.status}`,
      400
    );
  }

  // Update booking
  await Booking.findByIdAndUpdate(booking._id, {
    $set: {
      status:             "cancelled",
      cancelledAt:        new Date(),
      cancellationReason: reason || "Cancelled by customer",
    },
  });

  // Free up the slot
  if (booking.slotId) {
    await Slot.findByIdAndUpdate(booking.slotId, {
      $set: {
        isBooked:  false,
        bookingId: null,
      },
    });
  }

  return successResponse(
    res,
    "Booking cancelled successfully",
    {
      bookingId:    booking._id,
      bookingNo:    booking.bookingNo,
      refundStatus: booking.paymentStatus === "success"
        ? "Refund will be processed in 3-5 business days"
        : "No payment was made",
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/booking/:id/jobcard/approve
// @desc    Customer approves job card modification
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const approveJobCard = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id:        req.params.id,
    customerId: req.user._id,
    isDeleted:  false,
  });

  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  if (!booking.jobCard || !booking.jobCard.items.length) {
    return errorResponse(
      res,
      "No job card modifications to approve",
      400
    );
  }

  await Booking.findByIdAndUpdate(booking._id, {
    $set: {
      "jobCard.customerApproved": true,
      "jobCard.approvedAt":       new Date(),
      totalAmount:
        booking.jobCard.revisedAmount +
        Math.round(booking.jobCard.revisedAmount * 0.18),
    },
  });

  return successResponse(
    res,
    "Job card approved successfully",
    {
      bookingId:     booking._id,
      revisedAmount: booking.jobCard.revisedAmount,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/booking/:id/pay
// @desc    Capture payment for booking
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const payBooking = asyncHandler(async (req, res) => {
  const { paymentId, paymentMode } = req.body;

  const booking = await Booking.findOne({
    _id:        req.params.id,
    customerId: req.user._id,
    isDeleted:  false,
  });

  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  if (booking.paymentStatus === "success") {
    return errorResponse(
      res,
      "Payment already completed",
      400
    );
  }

  await Booking.findByIdAndUpdate(booking._id, {
    $set: {
      paymentStatus: "success",
      paymentId,
      paymentMode: paymentMode || booking.paymentMode,
    },
  });

  return successResponse(
    res,
    "Payment captured successfully",
    {
      bookingId:   booking._id,
      bookingNo:   booking.bookingNo,
      totalAmount: booking.totalAmount,
      paymentMode: paymentMode || booking.paymentMode,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/booking/:id/invoice
// @desc    Get on-demand tax invoice
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const getInvoice = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id:        req.params.id,
    customerId: req.user._id,
    isDeleted:  false,
  })
    .populate("serviceId",  "name")
    .populate("vehicleId",  "registrationNo brand model")
    .populate("franchiseId","name mobileNo");

  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  if (booking.status !== "completed") {
    return errorResponse(
      res,
      "Invoice available only after service completion",
      400
    );
  }

  // Invoice data
  // PDF generation will be added in Phase 12
  const invoice = {
    invoiceNo:    `INV-${booking.bookingNo}`,
    bookingNo:    booking.bookingNo,
    date:         booking.completedAt,
    customer: {
      name:     req.user.name,
      mobile:   req.user.mobileNo,
    },
    franchise: {
      name:     booking.franchiseId?.name,
      mobile:   booking.franchiseId?.mobileNo,
    },
    vehicle: {
      registrationNo: booking.vehicleId?.registrationNo,
      brand:          booking.vehicleId?.brand,
      model:          booking.vehicleId?.model,
    },
    service: {
      name:   booking.serviceName,
    },
    jobCardItems:  booking.jobCard?.items || [],
    amount:        booking.amount,
    taxAmount:     booking.taxAmount,
    taxPercent:    18,
    totalAmount:   booking.totalAmount,
    paymentMode:   booking.paymentMode,
    paymentStatus: booking.paymentStatus,
  };

  return successResponse(
    res,
    "Invoice fetched successfully",
    { invoice }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/booking/:id/rate
// @desc    Rate franchise after service completion
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const rateBooking = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return errorResponse(
      res,
      "Rating must be between 1 and 5",
      400
    );
  }

  const booking = await Booking.findOne({
    _id:        req.params.id,
    customerId: req.user._id,
    isDeleted:  false,
  });

  if (!booking) {
    return errorResponse(res, "Booking not found", 404);
  }

  if (booking.status !== "completed") {
    return errorResponse(
      res,
      "Can only rate after service is completed",
      400
    );
  }

  if (booking.rating?.stars) {
    return errorResponse(
      res,
      "You have already rated this booking",
      400
    );
  }

  await Booking.findByIdAndUpdate(booking._id, {
    $set: {
      rating: {
        stars:   rating,
        comment: comment || "",
        ratedAt: new Date(),
      },
    },
  });

  return successResponse(
    res,
    "Rating submitted successfully",
    { rating, comment }
  );
});

// ─────────────────────────────────────────────────────────
// ADMIN: Create service in catalog
// @route   POST /api/booking/services
// @access  Private (IT Admin)
// ─────────────────────────────────────────────────────────
const createService = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    icon,
    serviceType,
    pricing,
    serviceMode,
    estimatedDuration,
    hasWarranty,
    warrantyDays,
    sortOrder,
  } = req.body;

  const service = await Service.create({
    name,
    description,
    icon,
    serviceType:       serviceType || "csp",
    pricing:           pricing     || {},
    serviceMode:       serviceMode || "both",
    estimatedDuration: estimatedDuration || 60,
    hasWarranty:       hasWarranty || false,
    warrantyDays:      warrantyDays || 0,
    sortOrder:         sortOrder   || 0,
    createdBy:         req.user._id,
  });

  return createdResponse(
    res,
    "Service created successfully",
    { service }
  );
});

module.exports = {
  getServices,
  getFranchises,
  getSlots,
  createBooking,
  getBookings,
  getBookingById,
  cancelBooking,
  approveJobCard,
  payBooking,
  getInvoice,
  rateBooking,
  createService,
};