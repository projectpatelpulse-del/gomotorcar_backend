const CleanerProfile = require("../models/cleanerProfile.model");
const User           = require("../models/user.model");
const asyncHandler   = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");
const { ROLES, USER_STATUS } = require("../config/constants");

// ─────────────────────────────────────────────────────────
// @route   POST /api/cleaner/profile
// @desc    Car Cleaner submits registration form
// @access  Private (CL role only)
// ─────────────────────────────────────────────────────────
const submitCleanerProfile = asyncHandler(async (req, res) => {
  const {
    dateOfBirth,
    gender,
    aadharNo,
    panNo,
    aadharFrontPic,
    aadharBackPic,
    profilePic,
    cleanerType,
    cleaningTypes,
    preferredAreas,
    preferredPinCodes,
    bankDetails,
    upiId,
    emergencyContact,
  } = req.body;

  // Only Car Cleaner role can submit this form
  if (req.user.role !== ROLES.CAR_CLEANER) {
    return errorResponse(
      res,
      "Only Car Cleaners can submit this form",
      403
    );
  }

  // Check if profile already submitted
  const existing = await CleanerProfile.findOne({
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

  // Create profile
  const profile = await CleanerProfile.create({
    userId: req.user._id,
    dateOfBirth,
    gender,
    aadharNo,
    panNo,
    aadharFrontPic,
    aadharBackPic,
    profilePic,
    cleanerType,
    cleaningTypes,
    preferredAreas,
    preferredPinCodes,
    bankDetails,
    upiId,
    emergencyContact,
    isFormComplete: true,
  });

  // Update user name and profile pic in User model too
  await User.findByIdAndUpdate(req.user._id, {
    $set: { profilePic: profilePic || req.user.profilePic },
  });

  return createdResponse(
    res,
    "Profile submitted successfully. Awaiting admin approval.",
    { profile }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/cleaner/profile
// @desc    Get cleaner's own profile
// @access  Private (CL role only)
// ─────────────────────────────────────────────────────────
const getCleanerProfile = asyncHandler(async (req, res) => {
  const profile = await CleanerProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  }).populate("userId", "name mobileNo role status partnerId");

  if (!profile) {
    return errorResponse(res, "Profile not found. Please submit your profile first.", 404);
  }

  return successResponse(
    res,
    "Profile fetched successfully",
    { profile }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/cleaner/profile
// @desc    Update cleaner profile
// @access  Private (CL role only)
// ─────────────────────────────────────────────────────────
const updateCleanerProfile = asyncHandler(async (req, res) => {
  const profile = await CleanerProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  });

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  const updatedProfile = await CleanerProfile.findByIdAndUpdate(
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
// @route   GET /api/admin/cleaner/:userId/profile
// @desc    Admin views cleaner profile for approval
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const getCleanerProfileByAdmin = asyncHandler(async (req, res) => {
  const profile = await CleanerProfile.findOne({
    userId:    req.params.userId,
    isDeleted: false,
  }).populate("userId", "name mobileNo role status createdAt");

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  return successResponse(
    res,
    "Cleaner profile fetched successfully",
    { profile }
  );
});

module.exports = {
  submitCleanerProfile,
  getCleanerProfile,
  updateCleanerProfile,
  getCleanerProfileByAdmin,
};