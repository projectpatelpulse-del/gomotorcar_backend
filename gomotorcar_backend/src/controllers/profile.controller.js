const User        = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
} = require("../utils/responseHandler");

// ─────────────────────────────────────────────────────────
// @route   GET /api/profile
// @desc    Get logged in user full profile
// @access  Private
// ─────────────────────────────────────────────────────────
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-sessionToken -__v"
  );

  if (!user) {
    return errorResponse(res, "User not found", 404);
  }

  return successResponse(res, "Profile fetched successfully", { user });
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/profile
// @desc    Update logged in user profile
// @access  Private
// ─────────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    businessName,
    gstNo,
    address,
  } = req.body;

  // Fields allowed to update
  // Mobile no and role are NOT updatable
  const updateFields = {};
  if (name)         updateFields.name         = name;
  if (email)        updateFields.email        = email;
  if (businessName) updateFields.businessName = businessName;
  if (gstNo)        updateFields.gstNo        = gstNo;
  if (address)      updateFields.address      = address;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select("-sessionToken -__v");

  if (!user) {
    return errorResponse(res, "User not found", 404);
  }

  return successResponse(res, "Profile updated successfully", { user });
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/profile/picture
// @desc    Update profile picture
// @access  Private
// ─────────────────────────────────────────────────────────
const updateProfilePicture = asyncHandler(async (req, res) => {
  const { profilePic } = req.body;

  // For now accepting URL directly
  // Later will integrate with S3 file upload
  if (!profilePic) {
    return errorResponse(res, "Profile picture URL is required", 400);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { profilePic } },
    { new: true }
  ).select("-sessionToken -__v");

  return successResponse(
    res,
    "Profile picture updated successfully",
    { profilePic: user.profilePic }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/profile/stats
// @desc    Get user stats (bookings count, savings, active)
// @access  Private
// ─────────────────────────────────────────────────────────
const getProfileStats = asyncHandler(async (req, res) => {
  // These will be calculated from actual booking data
  // in Phase 5 when bookings module is ready
  // For now returning structure

  const stats = {
    totalBookings:  0,
    totalSavings:   0,
    activeServices: 0,
  };

  return successResponse(
    res,
    "Profile stats fetched successfully",
    { stats }
  );
});

module.exports = {
  getProfile,
  updateProfile,
  updateProfilePicture,
  getProfileStats,
};