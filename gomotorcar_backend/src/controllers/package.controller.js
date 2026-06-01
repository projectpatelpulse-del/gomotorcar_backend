const Package    = require("../models/package.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");

// ─────────────────────────────────────────────────────────
// @route   POST /api/packages
// @desc    Admin creates a package
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const createPackage = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    packageType,
    apartmentId,
    durationDays,
    externalCleanings,
    internalCleanings,
    price,
    extraCleaningPrice,
  } = req.body;

  const pkg = await Package.create({
    name,
    description,
    packageType,
    apartmentId,
    durationDays,
    externalCleanings,
    internalCleanings,
    price,
    extraCleaningPrice,
    createdBy: req.user._id,
  });

  return createdResponse(
    res,
    "Package created successfully",
    { package: pkg }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/packages
// @desc    Get all active packages (Customer sees this)
// @access  Private
// ─────────────────────────────────────────────────────────
const getPackages = asyncHandler(async (req, res) => {
  const { packageType, apartmentId } = req.query;

  const filter = {
    isActive:  true,
    isDeleted: false,
  };

  if (packageType) filter.packageType = packageType;
  if (apartmentId) filter.apartmentId = apartmentId;

  const packages = await Package.find(filter)
    .sort({ price: 1 }); // cheapest first

  return successResponse(
    res,
    "Packages fetched successfully",
    {
      count:    packages.length,
      packages,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/packages/:id
// @desc    Get single package details
// @access  Private
// ─────────────────────────────────────────────────────────
const getPackageById = asyncHandler(async (req, res) => {
  const pkg = await Package.findOne({
    _id:       req.params.id,
    isActive:  true,
    isDeleted: false,
  });

  if (!pkg) {
    return errorResponse(res, "Package not found", 404);
  }

  return successResponse(
    res,
    "Package fetched successfully",
    { package: pkg }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/packages/:id
// @desc    Admin updates a package
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const updatePackage = asyncHandler(async (req, res) => {
  const pkg = await Package.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!pkg) {
    return errorResponse(res, "Package not found", 404);
  }

  return successResponse(
    res,
    "Package updated successfully",
    { package: pkg }
  );
});

// ─────────────────────────────────────────────────────────
// @route   DELETE /api/packages/:id
// @desc    Admin deactivates a package
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const deletePackage = asyncHandler(async (req, res) => {
  await Package.findByIdAndUpdate(req.params.id, {
    $set: { isDeleted: true, isActive: false },
  });

  return successResponse(res, "Package deleted successfully");
});

module.exports = {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
};