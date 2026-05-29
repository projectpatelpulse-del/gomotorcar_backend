const NCSPProfile  = require("../models/ncspProfile.model");
const User         = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");
const { ROLES } = require("../config/constants");

// ─────────────────────────────────────────────────────────
// @route   POST /api/ncsp/profile
// @desc    NCSP submits registration form
// @access  Private (NC role only)
// ─────────────────────────────────────────────────────────
const submitNCSPProfile = asyncHandler(async (req, res) => {
  const {
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
    services,
    businessImages,
    logoImage,
    workingHours,
    workingDays,
    bankDetails,
  } = req.body;

  // Only NCSP role can submit this form
  if (req.user.role !== ROLES.NCSP) {
    return errorResponse(
      res,
      "Only NCSP partners can submit this form",
      403
    );
  }

  // Check if profile already submitted
  const existing = await NCSPProfile.findOne({
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

  const profile = await NCSPProfile.create({
    userId: req.user._id,
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
    services,
    businessImages,
    logoImage,
    workingHours,
    workingDays,
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
// @route   GET /api/ncsp/profile
// @desc    NCSP gets own profile
// @access  Private (NC role only)
// ─────────────────────────────────────────────────────────
const getNCSPProfile = asyncHandler(async (req, res) => {
  const profile = await NCSPProfile.findOne({
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
// @route   PUT /api/ncsp/profile
// @desc    NCSP updates own profile
// @access  Private (NC role only)
// ─────────────────────────────────────────────────────────
const updateNCSPProfile = asyncHandler(async (req, res) => {
  const profile = await NCSPProfile.findOne({
    userId:    req.user._id,
    isDeleted: false,
  });

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  // Handle location update if lat/lng provided
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

  const updatedProfile = await NCSPProfile.findByIdAndUpdate(
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
// @route   GET /api/admin/ncsp/:userId/profile
// @desc    Admin views NCSP profile for approval
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const getNCSPProfileByAdmin = asyncHandler(async (req, res) => {
  const profile = await NCSPProfile.findOne({
    userId:    req.params.userId,
    isDeleted: false,
  }).populate("userId", "name mobileNo role status createdAt");

  if (!profile) {
    return errorResponse(res, "Profile not found", 404);
  }

  return successResponse(
    res,
    "NCSP profile fetched successfully",
    { profile }
  );
});

module.exports = {
  submitNCSPProfile,
  getNCSPProfile,
  updateNCSPProfile,
  getNCSPProfileByAdmin,
};