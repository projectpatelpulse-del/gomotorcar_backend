const User        = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");
const {
  ROLES,
  USER_STATUS,
  ADMIN_CREATED_ROLES,
} = require("../config/constants");

// ─────────────────────────────────────────────────────────
// HELPER — Generate Partner ID e.g. CL-00042
// ─────────────────────────────────────────────────────────
const generatePartnerId = async (role) => {
  const count = await User.countDocuments({ role });
  const padded = String(count + 1).padStart(5, "0");
  return `${role}-${padded}`;
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/users
// @desc    Get all users with filters
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const getAllUsers = asyncHandler(async (req, res) => {
  const {
    role,
    status,
    page  = 1,
    limit = 10,
  } = req.query;

  const filter = { isDeleted: false };
  if (role)   filter.role   = role;
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-sessionToken -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  return successResponse(res, "Users fetched successfully", {
    total,
    page:       parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
    users,
  });
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/admin/users/pending
// @desc    Get all users pending approval
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const getPendingUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;

  const filter = {
    isDeleted: false,
    status:    USER_STATUS.PENDING_APPROVAL,
  };
  if (role) filter.role = role;

  const users = await User.find(filter)
    .select("-sessionToken -__v")
    .sort({ createdAt: -1 });

  return successResponse(res, "Pending users fetched successfully", {
    count: users.length,
    users,
  });
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/users/:id/approve
// @desc    Approve a partner registration
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const approveUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id:       req.params.id,
    isDeleted: false,
  });

  if (!user) {
    return errorResponse(res, "User not found", 404);
  }

  if (user.status !== USER_STATUS.PENDING_APPROVAL) {
    return errorResponse(
      res,
      `User is already ${user.status}`,
      400
    );
  }

  // Generate Partner ID on approval
  const partnerId = await generatePartnerId(user.role);

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        status:      USER_STATUS.ACTIVE,
        partnerId,
        approvedBy:  req.user._id,
        approvedAt:  new Date(),
        activatedAt: new Date(),
      },
    },
    { new: true }
  ).select("-sessionToken -__v");

  // TODO: Send approval notification to user (Phase 9)

  return successResponse(res, "User approved successfully", {
    user: updatedUser,
  });
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/users/:id/reject
// @desc    Reject a partner registration
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const rejectUser = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const user = await User.findOne({
    _id:       req.params.id,
    isDeleted: false,
  });

  if (!user) {
    return errorResponse(res, "User not found", 404);
  }

  if (user.status !== USER_STATUS.PENDING_APPROVAL) {
    return errorResponse(
      res,
      `User is already ${user.status}`,
      400
    );
  }

  await User.findByIdAndUpdate(req.params.id, {
    $set: {
      status:     USER_STATUS.REJECTED,
      rejectedBy: req.user._id,
      rejectedAt: new Date(),
      rejectionReason: reason || "Not specified",
    },
  });

  // TODO: Send rejection notification to user (Phase 9)

  return successResponse(res, "User rejected successfully");
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/admin/users/create
// @desc    Admin creates internal user (Supervisor, Ops, IT)
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const createInternalUser = asyncHandler(async (req, res) => {
  const { mobileNo, role, name, email } = req.body;

  // Only admin-created roles allowed here
  if (!ADMIN_CREATED_ROLES.includes(role)) {
    return errorResponse(
      res,
      "This role must self-register. Use /api/auth/register instead.",
      400
    );
  }

  // Check mobile already exists
  const existing = await User.findOne({ mobileNo, isDeleted: false });
  if (existing) {
    return errorResponse(res, "Mobile number already registered", 409);
  }

  // Generate Partner ID immediately (no approval needed for internal)
  const partnerId = await generatePartnerId(role);

  const user = await User.create({
    mobileNo,
    role,
    name,
    email,
    partnerId,
    status:      USER_STATUS.ACTIVE,
    createdBy:   req.user._id,
    approvedBy:  req.user._id,
    approvedAt:  new Date(),
    activatedAt: new Date(),
  });

  return createdResponse(
    res,
    "Internal user created successfully",
    {
      user: {
        id:        user._id,
        mobileNo:  user.mobileNo,
        role:      user.role,
        partnerId: user.partnerId,
        status:    user.status,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/users/:id/activate
// @desc    Activate an inactive user
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const activateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { status: USER_STATUS.ACTIVE } },
    { new: true }
  ).select("-sessionToken -__v");

  if (!user) {
    return errorResponse(res, "User not found", 404);
  }

  return successResponse(
    res,
    "User activated successfully",
    { user }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/admin/users/:id/deactivate
// @desc    Deactivate an active user
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { status: USER_STATUS.INACTIVE } },
    { new: true }
  ).select("-sessionToken -__v");

  if (!user) {
    return errorResponse(res, "User not found", 404);
  }

  return successResponse(
    res,
    "User deactivated successfully",
    { user }
  );
});

module.exports = {
  getAllUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  createInternalUser,
  activateUser,
  deactivateUser,
};