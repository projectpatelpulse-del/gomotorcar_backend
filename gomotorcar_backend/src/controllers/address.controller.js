const Address     = require("../models/address.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");

// ─────────────────────────────────────────────────────────
// @route   POST /api/addresses
// @desc    Add new address
// @access  Private
// ─────────────────────────────────────────────────────────
const addAddress = asyncHandler(async (req, res) => {
  const {
    type,
    label,
    line1,
    line2,
    landmark,
    city,
    state,
    pinCode,
    latitude,
    longitude,
    isDefault,
  } = req.body;

  // If setting as default, remove default from others
  if (isDefault) {
    await Address.updateMany(
      { userId: req.user._id, isDeleted: false },
      { $set: { isDefault: false } }
    );
  }

  // Check if first address — make it default automatically
  const addressCount = await Address.countDocuments({
    userId:    req.user._id,
    isDeleted: false,
  });

  const address = await Address.create({
    userId: req.user._id,
    type,
    label,
    line1,
    line2,
    landmark,
    city,
    state,
    pinCode,
    location: {
      type:        "Point",
      coordinates: [
        parseFloat(longitude) || 0,
        parseFloat(latitude)  || 0,
      ],
    },
    isDefault: addressCount === 0 ? true : (isDefault || false),
  });

  return createdResponse(res, "Address added successfully", { address });
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/addresses
// @desc    Get all addresses of logged in user
// @access  Private
// ─────────────────────────────────────────────────────────
const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({
    userId:    req.user._id,
    isDeleted: false,
  }).sort({ isDefault: -1, createdAt: -1 });
  // Default address always on top

  return successResponse(res, "Addresses fetched successfully", {
    count:     addresses.length,
    addresses,
  });
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/addresses/:id
// @desc    Update an address
// @access  Private
// ─────────────────────────────────────────────────────────
const updateAddress = asyncHandler(async (req, res) => {
  const {
    type,
    label,
    line1,
    line2,
    landmark,
    city,
    state,
    pinCode,
    latitude,
    longitude,
    isDefault,
  } = req.body;

  // Check address belongs to user
  const existing = await Address.findOne({
    _id:       req.params.id,
    userId:    req.user._id,
    isDeleted: false,
  });

  if (!existing) {
    return errorResponse(res, "Address not found", 404);
  }

  // If setting as default remove from others first
  if (isDefault) {
    await Address.updateMany(
      { userId: req.user._id, isDeleted: false },
      { $set: { isDefault: false } }
    );
  }

  const updateFields = {};
  if (type)      updateFields.type      = type;
  if (label)     updateFields.label     = label;
  if (line1)     updateFields.line1     = line1;
  if (line2)     updateFields.line2     = line2;
  if (landmark)  updateFields.landmark  = landmark;
  if (city)      updateFields.city      = city;
  if (state)     updateFields.state     = state;
  if (pinCode)   updateFields.pinCode   = pinCode;
  if (isDefault !== undefined) updateFields.isDefault = isDefault;

  if (latitude && longitude) {
    updateFields.location = {
      type:        "Point",
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };
  }

  const address = await Address.findByIdAndUpdate(
    req.params.id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  return successResponse(
    res,
    "Address updated successfully",
    { address }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/addresses/:id/default
// @desc    Set an address as default
// @access  Private
// ─────────────────────────────────────────────────────────
const setDefaultAddress = asyncHandler(async (req, res) => {
  // Remove default from all first
  await Address.updateMany(
    { userId: req.user._id, isDeleted: false },
    { $set: { isDefault: false } }
  );

  const address = await Address.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id, isDeleted: false },
    { $set: { isDefault: true } },
    { new: true }
  );

  if (!address) {
    return errorResponse(res, "Address not found", 404);
  }

  return successResponse(
    res,
    "Default address updated successfully",
    { address }
  );
});

// ─────────────────────────────────────────────────────────
// @route   DELETE /api/addresses/:id
// @desc    Delete (soft) an address
// @access  Private
// ─────────────────────────────────────────────────────────
const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id:       req.params.id,
    userId:    req.user._id,
    isDeleted: false,
  });

  if (!address) {
    return errorResponse(res, "Address not found", 404);
  }

  await Address.findByIdAndUpdate(req.params.id, {
    $set: { isDeleted: true, isDefault: false },
  });

  // If deleted address was default → make first remaining address default
  if (address.isDefault) {
    const nextAddress = await Address.findOne({
      userId:    req.user._id,
      isDeleted: false,
    }).sort({ createdAt: 1 });

    if (nextAddress) {
      await Address.findByIdAndUpdate(nextAddress._id, {
        $set: { isDefault: true },
      });
    }
  }

  return successResponse(res, "Address deleted successfully");
});

module.exports = {
  addAddress,
  getAddresses,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
};