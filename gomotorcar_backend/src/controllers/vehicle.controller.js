const Vehicle     = require("../models/vehicle.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");

// ─────────────────────────────────────────────────────────
// @route   POST /api/vehicles
// @desc    Add a new vehicle
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const addVehicle = asyncHandler(async (req, res) => {
  const {
    registrationNo,
    brand,
    model,
    variant,
    year,
    color,
    category,
    fuelType,
  } = req.body;

  // Check if vehicle already added by this user
  const existing = await Vehicle.findOne({
    userId:         req.user._id,
    registrationNo: registrationNo.toUpperCase(),
    isDeleted:      false,
  });

  if (existing) {
    return errorResponse(
      res,
      "This vehicle is already added to your account",
      409
    );
  }

  // Check if first vehicle — make it primary automatically
  const vehicleCount = await Vehicle.countDocuments({
    userId:    req.user._id,
    isDeleted: false,
  });

  const vehicle = await Vehicle.create({
    userId: req.user._id,
    registrationNo: registrationNo.toUpperCase(),
    brand,
    model,
    variant,
    year,
    color,
    category,
    fuelType,
    isPrimary: vehicleCount === 0, // first car is primary
  });

  return createdResponse(res, "Vehicle added successfully", { vehicle });
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/vehicles
// @desc    Get all vehicles of logged in user
// @access  Private
// ─────────────────────────────────────────────────────────
const getVehicles = asyncHandler(async (req, res) => {
  const vehicles = await Vehicle.find({
    userId:    req.user._id,
    isDeleted: false,
  }).sort({ isPrimary: -1, createdAt: -1 });
  // Primary vehicle always on top

  return successResponse(res, "Vehicles fetched successfully", {
    count:    vehicles.length,
    vehicles,
  });
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/vehicles/:id
// @desc    Get single vehicle details
// @access  Private
// ─────────────────────────────────────────────────────────
const getVehicleById = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOne({
    _id:       req.params.id,
    userId:    req.user._id,
    isDeleted: false,
  });

  if (!vehicle) {
    return errorResponse(res, "Vehicle not found", 404);
  }

  return successResponse(
    res,
    "Vehicle fetched successfully",
    { vehicle }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/vehicles/:id/primary
// @desc    Set a vehicle as primary
// @access  Private
// ─────────────────────────────────────────────────────────
const setPrimaryVehicle = asyncHandler(async (req, res) => {
  // Remove primary from all user vehicles first
  await Vehicle.updateMany(
    { userId: req.user._id },
    { $set: { isPrimary: false } }
  );

  // Set selected vehicle as primary
  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id, isDeleted: false },
    { $set: { isPrimary: true } },
    { new: true }
  );

  if (!vehicle) {
    return errorResponse(res, "Vehicle not found", 404);
  }

  return successResponse(
    res,
    "Primary vehicle updated successfully",
    { vehicle }
  );
});

// ─────────────────────────────────────────────────────────
// @route   DELETE /api/vehicles/:id
// @desc    Delete (soft) a vehicle
// @access  Private
// ─────────────────────────────────────────────────────────
const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOne({
    _id:       req.params.id,
    userId:    req.user._id,
    isDeleted: false,
  });

  if (!vehicle) {
    return errorResponse(res, "Vehicle not found", 404);
  }

  // Cannot delete primary vehicle if other vehicles exist
  if (vehicle.isPrimary) {
    const otherVehicles = await Vehicle.countDocuments({
      userId:    req.user._id,
      isDeleted: false,
      _id:       { $ne: req.params.id },
    });

    if (otherVehicles > 0) {
      return errorResponse(
        res,
        "Cannot delete primary vehicle. Set another vehicle as primary first.",
        400
      );
    }
  }

  // Soft delete
  await Vehicle.findByIdAndUpdate(req.params.id, {
    $set: { isDeleted: true, isPrimary: false },
  });

  return successResponse(res, "Vehicle deleted successfully");
});

module.exports = {
  addVehicle,
  getVehicles,
  getVehicleById,
  setPrimaryVehicle,
  deleteVehicle,
};