const FranchiseeProfile = require("../models/franchiseeProfile.model");
const User              = require("../models/user.model");
const asyncHandler      = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");
const { ROLES } = require("../config/constants");

// ─────────────────────────────────────────────────────────
// @route   POST /api/franchisee/profile
// @desc    Franchisee submits registration form
// @access  Private (FR or FS role only)
// ─────────────────────────────────────────────────────────
const submitFranchiseeProfile = asyncHandler(async (req, res) => {
  const {
    franchiseType,
    businessName,
    ownerName,
    contactPersonName,
    contactPersonMobile,
    businessEmail,
    gstNo,
    gstCertificatePic,
    businessAddress,
    latitude,
    longitude,
    servicePinCodes,
    services,
    workingHours,
    workingDays,
    weeklyOff,
    vanDetails,
    businessImages,
    logoImage,
    paymentModes,
    bankDetails,
  } = req.body;

  // Only FR or FS role allowed
  if (
    req.user.role !== ROLES.FRANCHISEE_CSP &&
    req.user.role !== ROLES.FRANCHISEE_STEAM
  ) {
    return errorResponse(
      res,
      "Only Franchisee partners can submit this form",
      403
    );
  }

  // Steam Car Wash must provide service pin codes
  if (
    req.user.role === ROLES.FRANCHISEE_STEAM &&
    (!servicePinCodes || servicePinCodes.length === 0)
  ) {
    return errorResponse(
      res,
      "Steam Car Wash franchisee must provide service pin codes",
      400
    );
  }

  // Check profile already submitted
  const existing = await FranchiseeProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  });

  if (existing) {
    return errorResponse(
      res,
      "Profile already submitted. Use update API to make changes.",
      409
    );
  }

  const profile = await FranchiseeProfile.create({
    userId: req.user._id,
    franchiseType: req.user.role === ROLES.FRANCHISEE_CSP
      ? "csp"
      : "steam_wash",
    businessName,
    ownerName,
    contactPersonName,
    contactPersonMobile,
    businessEmail,
    gstNo,
    gstCertificatePic,
    businessAddress,
    location: {
      type:        "Point",
      coordinates: [
        parseFloat(longitude) || 0,
        parseFloat(latitude)  || 0,
      ],
    },
    servicePinCodes: servicePinCodes || [],
    services:        services        || [],
    workingHours,
    workingDays,
    weeklyOff,
    vanDetails,
    businessImages,
    logoImage,
    paymentModes,
    bankDetails,
    isFormComplete: true,
  });

  // Update businessName in User model
  await User.findByIdAndUpdate(req.user._id, {
    $set: { businessName },
  });

  return createdResponse(
    res,
    "Profile submitted successfully. Awaiting admin approval.",
    { profile }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/franchisee/profile
// @desc    Franchisee gets own profile
// @access  Private (FR or FS role only)
// ─────────────────────────────────────────────────────────
const getFranchiseeProfile = asyncHandler(async (req, res) => {
  const profile = await FranchiseeProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  }).populate("userId", "name mobileNo role status partnerId");

  if (!profile) {
    return errorResponse(
      res,
      "Profile not found. Please submit your profile first.",
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
// @route   PUT /api/franchisee/profile
// @desc    Franchisee updates own profile
// @access  Private (FR or FS role only)
// ─────────────────────────────────────────────────────────
const updateFranchiseeProfile = asyncHandler(async (req, res) => {
  const profile = await FranchiseeProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  });

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  // Handle location update
  if (req.body.latitude && req.body.longitude) {
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

  const updatedProfile = await FranchiseeProfile.findByIdAndUpdate(
    profile._id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  return successResponse(
    res,
    "Profile updated successfully",
    { profile: updatedProfile }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/franchisee/:userId/profile
// @desc    Admin views franchisee profile for approval
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const getFranchiseeProfileByAdmin = asyncHandler(async (req, res) => {
  const profile = await FranchiseeProfile.findOne({
    userId:    req.params.userId,
    isDeleted: false,
  }).populate("userId", "name mobileNo role status createdAt");

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  return successResponse(
    res,
    "Franchisee profile fetched successfully",
    { profile }
  );
});

module.exports = {
  submitFranchiseeProfile,
  getFranchiseeProfile,
  updateFranchiseeProfile,
  getFranchiseeProfileByAdmin,
};