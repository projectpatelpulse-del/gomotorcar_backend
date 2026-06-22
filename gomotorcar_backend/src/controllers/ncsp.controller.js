const NCSPProfile  = require("../models/ncspProfile.model");
const Category     = require("../models/category.model");
const Lead         = require("../models/lead.model");
const Payment      = require("../models/payment.model");
const User         = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");

// ═══════════════════════════════════════════════════════════
// 1. REGISTRATION + GST VERIFICATION
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   POST /api/ncsp/verify-gst
// @desc    Verify GST number (simulated)
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const verifyGST = asyncHandler(async (req, res) => {
  const { gstNo } = req.body || {};

  if (!gstNo) {
    return errorResponse(res, "GST number is required", 400);
  }

  // GST number format validation
  // Format: 22AAAAA0000A1Z5
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  if (!gstRegex.test(gstNo.toUpperCase())) {
    return errorResponse(
      res,
      "Invalid GST number format. Correct format: 22AAAAA0000A1Z5",
      400
    );
  }

  // Simulated GST API response
  // In production: call real GST verification API
  const gstData = {
    gstNo:       gstNo.toUpperCase(),
    tradeName:   "AutoGloss Detailing Services",
    legalName:   "AutoGloss Detailing Pvt Ltd",
    address:     "Plot 45, Industrial Area, Bangalore",
    state:       "Karnataka",
    status:      "Active",
    registrationDate: "2020-01-15",
    isVerified:  true,
  };

  return successResponse(
    res,
    "GST verified successfully",
    { gstData }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/ncsp/payment/annual-fee
// @desc    Pay annual registration fee
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const payAnnualFee = asyncHandler(async (req, res) => {
  const { paymentId, amount } = req.body || {};

  if (!paymentId) {
    return errorResponse(
      res,
      "Payment ID is required",
      400
    );
  }

  // Update profile payment status
  const profile = await NCSPProfile.findOneAndUpdate(
    { userId: req.user._id, isDeleted: false },
    {
      $set: {
        annualFeeStatus: "paid",
        annualFeePaidAt: new Date(),
        annualFeeAmount: amount || 9999,
        appStatus:       "active",
        // Listing validity — 1 year
        listingValidTill: new Date(
          new Date().setFullYear(
            new Date().getFullYear() + 1
          )
        ),
      },
    },
    { new: true }
  );

  if (!profile) {
    return errorResponse(
      res,
      "NCSP profile not found. Please submit profile first.",
      404
    );
  }

  // Save payment record
  await Payment.create({
    customerId:    req.user._id,
    purpose:       "ncsp_annual_fee",
    amount:        amount || 9999,
    status:        "success",
    razorpayPaymentId: paymentId,
  });

  return successResponse(
    res,
    "Annual fee paid successfully. Your listing is now active.",
    {
      appStatus:       profile.appStatus,
      listingValidTill:profile.listingValidTill,
      amount:          amount || 9999,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/ncsp/payment/renew
// @desc    Renew annual package
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const renewAnnualFee = asyncHandler(async (req, res) => {
  const { paymentId, amount } = req.body || {};

  if (!paymentId) {
    return errorResponse(
      res,
      "Payment ID is required",
      400
    );
  }

  const profile = await NCSPProfile.findOneAndUpdate(
    { userId: req.user._id, isDeleted: false },
    {
      $set: {
        annualFeeStatus:  "paid",
        annualFeePaidAt:  new Date(),
        annualFeeAmount:  amount || 9999,
        appStatus:        "active",
        // Extend by 1 year from current validity
        listingValidTill: new Date(
          new Date().setFullYear(
            new Date().getFullYear() + 1
          )
        ),
      },
    },
    { new: true }
  );

  if (!profile) {
    return errorResponse(res, "NCSP profile not found", 404);
  }

  // Save payment
  await Payment.create({
    customerId:    req.user._id,
    purpose:       "ncsp_annual_fee",
    amount:        amount || 9999,
    status:        "success",
    razorpayPaymentId: paymentId,
  });

  return successResponse(
    res,
    "Annual fee renewed successfully",
    {
      appStatus:        profile.appStatus,
      listingValidTill: profile.listingValidTill,
      renewedAt:        new Date(),
    }
  );
});

// ═══════════════════════════════════════════════════════════
// 2. PROFILE MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/ncsp/profile
// @desc    Get NCSP own profile
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const getProfile = asyncHandler(async (req, res) => {
  const profile = await NCSPProfile.findOne({
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
// @route   PUT /api/ncsp/profile
// @desc    Update NCSP profile
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const {
    businessName, ownerName,
    contactPersonName, contactPersonMobile,
    businessEmail, businessAddress,
    businessImages, logoImage,
    bankDetails,
  } = req.body || {};

  const profile = await NCSPProfile.findOneAndUpdate(
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
// @route   PUT /api/ncsp/profile/timings
// @desc    Update working hours and weekly off
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const updateTimings = asyncHandler(async (req, res) => {
  const { workingHours, workingDays, weeklyOff } = req.body || {};

  const profile = await NCSPProfile.findOneAndUpdate(
    { userId: req.user._id, isDeleted: false },
    {
      $set: {
        workingHours,
        workingDays,
        weeklyOff,
      },
    },
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

// ═══════════════════════════════════════════════════════════
// 3. SERVICES MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/ncsp/services/catalog
// @desc    Get master service categories list
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const getServiceCatalog = asyncHandler(async (req, res) => {
  const categories = await Category.find({
    isActive:  true,
    isDeleted: false,
  })
    .select("name icon subCategories sortOrder")
    .sort({ sortOrder: 1 });

  return successResponse(
    res,
    "Service catalog fetched successfully",
    {
      count:      categories.length,
      categories,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/ncsp/services
// @desc    Add service to NCSP listing
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const addService = asyncHandler(async (req, res) => {
  const { serviceName, description, range } = req.body || {};

  if (!serviceName) {
    return errorResponse(res, "Service name is required", 400);
  }

  const profile = await NCSPProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  });

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  // Check service not already added
  const existing = profile.services.find(
    (s) => s.serviceName.toLowerCase() ===
      serviceName.toLowerCase()
  );

  if (existing) {
    return errorResponse(
      res,
      "Service already added to your listing",
      409
    );
  }

  // Add service
  profile.services.push({
    serviceName,
    description: description || "",
    range:       range        || "",
  });

  await profile.save();

  return createdResponse(
    res,
    "Service added successfully",
    {
      services: profile.services,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   DELETE /api/ncsp/services/:serviceId
// @desc    Remove service from NCSP listing
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const removeService = asyncHandler(async (req, res) => {
  const profile = await NCSPProfile.findOneAndUpdate(
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
// @route   POST /api/ncsp/services/suggest
// @desc    Suggest new service not in catalog
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const suggestService = asyncHandler(async (req, res) => {
  const { serviceName, description } = req.body || {};

  if (!serviceName) {
    return errorResponse(res, "Service name is required", 400);
  }

  // Store suggestion in profile
  // Admin will review and add to catalog
  await NCSPProfile.findOneAndUpdate(
    { userId: req.user._id, isDeleted: false },
    {
      $push: {
        serviceSuggestions: {
          serviceName,
          description: description || "",
          suggestedAt: new Date(),
          status:      "pending",
        },
      },
    }
  );

  return successResponse(
    res,
    "Service suggestion submitted. Admin will review and add to catalog.",
    { serviceName }
  );
});

// ═══════════════════════════════════════════════════════════
// 4. PRICING MATRIX
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   PUT /api/ncsp/pricing
// @desc    Update pricing matrix per service per vehicle type
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const updatePricing = asyncHandler(async (req, res) => {
  const { serviceId, pricing } = req.body || {};
  // pricing = { hatchback: 500, sedan: 700, suv: 900, luxury: 1500 }

  if (!serviceId || !pricing) {
    return errorResponse(
      res,
      "Service ID and pricing are required",
      400
    );
  }

  const profile = await NCSPProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  });

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  // Find service and update pricing
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
// 5. LEADS MANAGEMENT
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/ncsp/leads
// @desc    Get all leads for this NCSP
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const getLeads = asyncHandler(async (req, res) => {
  const {
    status, channel,
    page = 1, limit = 10,
  } = req.query;

  const filter = {
    providerId: req.user._id,
    isDeleted:  false,
  };

  if (status)  filter.status  = status;
  if (channel) filter.channel = channel;

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate("customerId", "name mobileNo")
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

// ─────────────────────────────────────────────────────────
// @route   GET /api/ncsp/leads/:id
// @desc    Get single lead detail
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const getLeadById = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({
    _id:        req.params.id,
    providerId: req.user._id,
    isDeleted:  false,
  }).populate("customerId", "name mobileNo");

  if (!lead) {
    return errorResponse(res, "Lead not found", 404);
  }

  return successResponse(
    res,
    "Lead fetched successfully",
    { lead }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PATCH /api/ncsp/leads/:id/status
// @desc    Update lead status (internal CRM)
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const updateLeadStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body || {};

  const validStatuses = [
    "new", "contacted", "converted", "lost",
  ];

  if (!validStatuses.includes(status)) {
    return errorResponse(
      res,
      `Invalid status. Valid: ${validStatuses.join(", ")}`,
      400
    );
  }

  const lead = await Lead.findOneAndUpdate(
    {
      _id:        req.params.id,
      providerId: req.user._id,
      isDeleted:  false,
    },
    { $set: { status, notes } },
    { new: true }
  );

  if (!lead) {
    return errorResponse(res, "Lead not found", 404);
  }

  return successResponse(
    res,
    "Lead status updated successfully",
    { lead }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/ncsp/leads/summary
// @desc    Lead summary aggregates
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const getLeadsSummary = asyncHandler(async (req, res) => {
  const { period = "monthly" } = req.query;

  const now   = new Date();
  let start;

  if (period === "weekly") {
    start = new Date(now);
    start.setDate(now.getDate() - 7);
  } else if (period === "annual") {
    start = new Date(now);
    start.setFullYear(now.getFullYear() - 1);
  } else {
    // Monthly
    start = new Date(now);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  const leads = await Lead.find({
    providerId: req.user._id,
    createdAt:  { $gte: start },
    isDeleted:  false,
  });

  const summary = {
    total:     leads.length,
    new:       leads.filter(l => l.status === "new").length,
    contacted: leads.filter(l => l.status === "contacted").length,
    converted: leads.filter(l => l.status === "converted").length,
    lost:      leads.filter(l => l.status === "lost").length,
    byChannel: {
      call:      leads.filter(l => l.channel === "call").length,
      whatsapp:  leads.filter(l => l.channel === "whatsapp").length,
    },
  };

  return successResponse(
    res,
    "Lead summary fetched successfully",
    { period, summary }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/ncsp/leads/cost-per-lead
// @desc    Calculate cost per lead ROI
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const getCostPerLead = asyncHandler(async (req, res) => {
  const profile = await NCSPProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  });

  const totalLeads = await Lead.countDocuments({
    providerId: req.user._id,
    isDeleted:  false,
  });

  const convertedLeads = await Lead.countDocuments({
    providerId: req.user._id,
    status:     "converted",
    isDeleted:  false,
  });

  const annualFee    = profile?.annualFeeAmount || 9999;
  const costPerLead  = totalLeads > 0
    ? Math.round(annualFee / totalLeads)
    : annualFee;

  const conversionRate = totalLeads > 0
    ? Math.round((convertedLeads / totalLeads) * 100)
    : 0;

  return successResponse(
    res,
    "Cost per lead calculated successfully",
    {
      roi: {
        annualFee,
        totalLeads,
        convertedLeads,
        costPerLead,
        conversionRate: `${conversionRate}%`,
        message:        costPerLead < 500
          ? "Excellent ROI!"
          : costPerLead < 1000
          ? "Good ROI"
          : "Improve conversion rate",
      },
    }
  );
});

// ═══════════════════════════════════════════════════════════
// 6. PROMOTIONAL OFFERS
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   POST /api/ncsp/offers
// @desc    Create promotional offer
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const createOffer = asyncHandler(async (req, res) => {
  const {
    title, description,
    banner, validFrom,
    validTo, discount,
  } = req.body || {};

  if (!title || !validFrom || !validTo) {
    return errorResponse(
      res,
      "Title, validFrom and validTo are required",
      400
    );
  }

  const profile = await NCSPProfile.findOneAndUpdate(
    { userId: req.user._id, isDeleted: false },
    {
      $push: {
        promotionalOffers: {
          title,
          description: description || "",
          banner:      banner      || "",
          validFrom:   new Date(validFrom),
          validTo:     new Date(validTo),
          discount:    discount    || "",
          isActive:    true,
          createdAt:   new Date(),
        },
      },
    },
    { new: true }
  );

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  return createdResponse(
    res,
    "Promotional offer created successfully. Goes to Value-for-Money feed.",
    {
      offers: profile.promotionalOffers,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/ncsp/offers
// @desc    Get all offers by this NCSP
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const getOffers = asyncHandler(async (req, res) => {
  const profile = await NCSPProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  }).select("promotionalOffers");

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  const offers = profile.promotionalOffers || [];

  // Add interest count (placeholder)
  const enrichedOffers = offers.map((offer) => ({
    ...offer.toObject(),
    interestCount: 0,
    isExpired: new Date(offer.validTo) < new Date(),
  }));

  return successResponse(
    res,
    "Offers fetched successfully",
    {
      count:  enrichedOffers.length,
      offers: enrichedOffers,
    }
  );
});

// ═══════════════════════════════════════════════════════════
// 7. RATINGS
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/ncsp/ratings
// @desc    Get ratings and reviews for this NCSP
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const getRatings = asyncHandler(async (req, res) => {
  // Get leads with ratings/notes as reviews
  const leads = await Lead.find({
    providerId: req.user._id,
    status:     "converted",
    notes:      { $exists: true, $ne: "" },
    isDeleted:  false,
  })
    .populate("customerId", "name")
    .sort({ updatedAt: -1 });

  // Calculate average from search ratings
  // Full ratings module in Phase 13
  const total = leads.length;

  return successResponse(
    res,
    "Ratings fetched successfully",
    {
      summary: {
        totalReviews:   total,
        averageRating:  4.2, // Placeholder — Phase 13
        message:        "Full ratings system available in Phase 13",
      },
      reviews: leads.map((l) => ({
        customerName: l.customerId?.name,
        review:       l.notes,
        date:         l.updatedAt,
      })),
    }
  );
});

// ═══════════════════════════════════════════════════════════
// 8. PAYMENT HISTORY
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// @route   GET /api/ncsp/payments
// @desc    Get payment history
// @access  Private (NC role)
// ─────────────────────────────────────────────────────────
const getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({
    customerId: req.user._id,
    purpose:    "ncsp_annual_fee",
    isDeleted:  false,
  }).sort({ createdAt: -1 });

  const profile = await NCSPProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  }).select("listingValidTill annualFeeStatus");

  return successResponse(
    res,
    "Payment history fetched successfully",
    {
      listing: {
        validTill:      profile?.listingValidTill || null,
        annualFeeStatus:profile?.annualFeeStatus  || "unpaid",
      },
      payments,
    }
  );
});

module.exports = {
  // Registration
  verifyGST,
  payAnnualFee,
  renewAnnualFee,
  // Profile
  getProfile,
  updateProfile,
  updateTimings,
  // Services
  getServiceCatalog,
  addService,
  removeService,
  suggestService,
  // Pricing
  updatePricing,
  // Leads
  getLeads,
  getLeadById,
  updateLeadStatus,
  getLeadsSummary,
  getCostPerLead,
  // Offers
  createOffer,
  getOffers,
  // Ratings
  getRatings,
  // Payments
  getPaymentHistory,
};