const bcrypt      = require("bcryptjs");
const jwt         = require("jsonwebtoken");
const crypto      = require("crypto");
const User        = require("../models/user.model");
const OTP         = require("../models/otp.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");
const {
  ROLES,
  USER_STATUS,
  OTP_PURPOSE,
  SELF_REGISTER_ROLES,
  REQUIRES_APPROVAL_ROLES,
  SINGLE_SESSION_ROLES,
} = require("../config/constants");

// ─────────────────────────────────────────────────────────
// HELPER : Generate 6 digit OTP
// ─────────────────────────────────────────────────────────
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// ─────────────────────────────────────────────────────────
// HELPER : Generate Partner ID  e.g. CL-00042
// ─────────────────────────────────────────────────────────
const generatePartnerId = async (role) => {
  const count = await User.countDocuments({ role });
  const padded = String(count + 1).padStart(5, "0");
  return `${role}-${padded}`;
};

// ─────────────────────────────────────────────────────────
// HELPER : Generate Access Token (short lived 15min)
// ─────────────────────────────────────────────────────────
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id:        user._id,
      role:      user.role,
      status:    user.status,
      partnerId: user.partnerId,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || "15m" }
  );
};

// ─────────────────────────────────────────────────────────
// HELPER : Generate Refresh Token (long lived 30days)
// ─────────────────────────────────────────────────────────
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || "30d" }
  );
};

// ─────────────────────────────────────────────────────────
// @route   POST /api/auth/otp/send
// @desc    Send OTP to mobile number
// @access  Public
// ─────────────────────────────────────────────────────────
const sendOTP = asyncHandler(async (req, res) => {
  const { mobileNo, purpose } = req.body;

  // Validate purpose
  if (!Object.values(OTP_PURPOSE).includes(purpose)) {
    return errorResponse(res, "Invalid OTP purpose", 400);
  }

  // For login purpose — check user exists
  if (purpose === OTP_PURPOSE.LOGIN) {
    const user = await User.findOne({ mobileNo, isDeleted: false });
    if (!user) {
      return errorResponse(res, "Mobile number not registered", 404);
    }
  }

  // Rate limit — max 3 OTPs per mobile per 10 minutes
  const recentOTPs = await OTP.countDocuments({
    mobileNo,
    purpose,
    createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
  });

  if (recentOTPs >= 3) {
    return errorResponse(
      res,
      "Too many OTP requests. Please wait 10 minutes.",
      429
    );
  }

  // Invalidate any previous unused OTPs for this mobile
  await OTP.updateMany(
    { mobileNo, purpose, isUsed: false },
    { isUsed: true }
  );

  // Generate OTP
  const rawOTP = generateOTP();
  const otpHash = await bcrypt.hash(rawOTP, 10);

  const expireMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES) || 5;

  // Save to DB
  await OTP.create({
    mobileNo,
    otpHash,
    purpose,
    expiresAt: new Date(Date.now() + expireMinutes * 60 * 1000),
  });

  // TODO: Integrate real SMS service here (Twilio, MSG91 etc)
  // For now we send OTP in response (DEVELOPMENT ONLY)
  console.log(`📱 OTP for ${mobileNo}: ${rawOTP}`);

  return successResponse(
    res,
    `OTP sent successfully to ${mobileNo}`,
    process.env.NODE_ENV === "development" ? { otp: rawOTP } : null
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/auth/otp/verify
// @desc    Verify OTP (used before registration or login)
// @access  Public
// ─────────────────────────────────────────────────────────
const verifyOTP = asyncHandler(async (req, res) => {
  const { mobileNo, otp, purpose } = req.body;

  // Find latest unused valid OTP
  const otpRecord = await OTP.findOne({
    mobileNo,
    purpose,
    isUsed:    false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    return errorResponse(res, "OTP expired or not found", 400);
  }

  // Max attempts check
  const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;
  if (otpRecord.attempts >= maxAttempts) {
    await OTP.findByIdAndUpdate(otpRecord._id, { isUsed: true });
    return errorResponse(
      res,
      "Maximum OTP attempts exceeded. Please request a new OTP.",
      400
    );
  }

  // Verify OTP
  const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);

  if (!isMatch) {
    // Increment attempts
    await OTP.findByIdAndUpdate(otpRecord._id, {
      $inc: { attempts: 1 },
    });
    return errorResponse(
      res,
      `Invalid OTP. ${maxAttempts - otpRecord.attempts - 1} attempts remaining.`,
      400
    );
  }

  // Mark OTP as used
  await OTP.findByIdAndUpdate(otpRecord._id, { isUsed: true });

  return successResponse(res, "OTP verified successfully", {
    mobileNo,
    verified: true,
  });
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/auth/register
// @desc    Register new user (self-registration roles only)
// @access  Public
// ─────────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { mobileNo, role, entityType, name, businessName, email } = req.body;

  // Only self-register roles allowed
  if (!SELF_REGISTER_ROLES.includes(role)) {
    return errorResponse(
      res,
      "This role cannot self-register. Contact admin.",
      403
    );
  }

  // Check mobile already registered
  const existingUser = await User.findOne({ mobileNo, isDeleted: false });
  if (existingUser) {
    return errorResponse(res, "Mobile number already registered", 409);
  }

  // Determine initial status
  // Customer → directly active, others → pending approval
  const initialStatus = REQUIRES_APPROVAL_ROLES.includes(role)
    ? USER_STATUS.PENDING_APPROVAL
    : USER_STATUS.ACTIVE;

  // Create user
  const user = await User.create({
    mobileNo,
    role,
    entityType,
    name,
    businessName,
    email,
    status: initialStatus,
  });

  return createdResponse(res, "Registration successful", {
    id:       user._id,
    mobileNo: user.mobileNo,
    role:     user.role,
    status:   user.status,
    message:
      initialStatus === USER_STATUS.PENDING_APPROVAL
        ? "Your account is pending approval. You will be notified once approved."
        : "Account created successfully.",
  });
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/auth/login
// @desc    Login with mobile number (after OTP verified)
// @access  Public
// ─────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { mobileNo, fcmToken } = req.body; // ← add fcmToken

  // Find user
  const user = await User.findOne({ mobileNo, isDeleted: false });
  if (!user) {
    return errorResponse(res, "User not found", 404);
  }

  // Check account status
  if (user.status === USER_STATUS.PENDING_APPROVAL) {
    return errorResponse(
      res,
      "Your account is pending approval. Please wait.",
      403
    );
  }

  if (user.status === USER_STATUS.REJECTED) {
    return errorResponse(
      res,
      "Your account has been rejected. Contact support.",
      403
    );
  }

  if (user.status === USER_STATUS.INACTIVE) {
    return errorResponse(
      res,
      "Your account is inactive. Contact support.",
      403
    );
  }

  // Generate tokens
  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Single session enforcement for Car Cleaners
  const sessionToken = crypto.randomBytes(32).toString("hex");

  // Update last login, session token AND fcm token
  const updateFields = {
    lastLoginAt: new Date(),
    sessionToken: SINGLE_SESSION_ROLES.includes(user.role)
      ? sessionToken
      : user.sessionToken,
  };

  // Save FCM token if provided
  if (fcmToken) {
    updateFields.fcmToken = fcmToken;
  }

  await User.findByIdAndUpdate(user._id, updateFields);

  return successResponse(res, "Login successful", {
    user: {
      id:        user._id,
      name:      user.name,
      mobileNo:  user.mobileNo,
      role:      user.role,
      status:    user.status,
      partnerId: user.partnerId,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  });
});




// ─────────────────────────────────────────────────────────
// @route   POST /api/auth/token/refresh
// @desc    Get new access token using refresh token
// @access  Public
// ─────────────────────────────────────────────────────────
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return errorResponse(res, "Refresh token is required", 400);
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    return errorResponse(res, "Invalid or expired refresh token", 401);
  }

  // Find user
  const user = await User.findById(decoded.id);
  if (!user || user.isDeleted) {
    return errorResponse(res, "User not found", 404);
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    return errorResponse(res, "Account is not active", 403);
  }

  // Issue new access token
  const newAccessToken = generateAccessToken(user);

  return successResponse(res, "Token refreshed successfully", {
    accessToken: newAccessToken,
  });
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
// ─────────────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  // Clear session token
  await User.findByIdAndUpdate(req.user.id, {
    sessionToken: null,
  });

  return successResponse(res, "Logged out successfully");
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/auth/me
// @desc    Get currently logged in user
// @access  Private
// ─────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "-sessionToken -__v"
  );

  if (!user) {
    return errorResponse(res, "User not found", 404);
  }

  return successResponse(res, "User fetched successfully", { user });
});


// ─────────────────────────────────────────────────────────
// @route   GET /api/auth/registration/:regId
// @desc    Poll registration/approval status
// @access  Public
// ─────────────────────────────────────────────────────────
const getRegistrationStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.regId).select(
    "name mobileNo role status partnerId createdAt approvedAt"
  );

  if (!user) {
    return errorResponse(res, "Registration not found", 404);
  }

  // Map status to what app needs to show
  const statusMap = {
    pending_approval: "PENDING",
    approved:         "PENDING",
    active:           "ACTIVE",
    rejected:         "REJECTED",
    inactive:         "INACTIVE",
  };

  // Check if payment required
  // NCSP needs annual fee payment after approval
  const PAYMENT_REQUIRED_ROLES = ["NC"];
  let displayStatus = statusMap[user.status] || "PENDING";

  if (
    user.status === "active" &&
    PAYMENT_REQUIRED_ROLES.includes(user.role)
  ) {
    // Will be updated in Phase 4 when payment module is ready
    displayStatus = "ACTIVE";
  }

  return successResponse(
    res,
    "Registration status fetched",
    {
      regId:     user._id,
      name:      user.name,
      role:      user.role,
      status:    displayStatus,
      partnerId: user.partnerId || null,
      message:   getStatusMessage(displayStatus, user.role),
      createdAt: user.createdAt,
      approvedAt:user.approvedAt || null,
    }
  );
});

// Helper — Status message for app splash screen
const getStatusMessage = (status, role) => {
  const messages = {
    PENDING:          "Your registration is under review. We will notify you once approved.",
    ACTIVE:           "Your account is active. You can now login.",
    REJECTED:         "Your registration was rejected. Please contact support.",
    PAYMENT_REQUIRED: "Please complete payment to activate your listing.",
    INACTIVE:         "Your account is inactive. Please contact support.",
  };
  return messages[status] || "Status unknown";
};

// ─────────────────────────────────────────────────────────
// @route   POST /api/auth/internal/login
// @desc    Login for internal users (Supervisor, Ops, Admin)
//          These users login with credentials not OTP
// @access  Public
// ─────────────────────────────────────────────────────────
const internalLogin = asyncHandler(async (req, res) => {
  const { mobileNo, password } = req.body;

  if (!mobileNo || !password) {
    return errorResponse(
      res,
      "Mobile number and password are required",
      400
    );
  }

  // Find user and include password for internal login
  const user = await User.findOne({
    mobileNo,
    isDeleted: false,
  }).select("+password");

  if (!user) {
    return errorResponse(res, "Invalid credentials", 401);
  }

  // Only internal roles allowed here
  const { INTERNAL_ROLES } = require("../config/constants");
  if (!INTERNAL_ROLES.includes(user.role)) {
    return errorResponse(
      res,
      "This login is only for internal team members",
      403
    );
  }

  // Check status
  if (user.status !== USER_STATUS.ACTIVE) {
    return errorResponse(
      res,
      `Account is ${user.status}. Contact admin.`,
      403
    );
  }

  // Verify password
  if (!user.password) {
    return errorResponse(res, "Invalid credentials", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return errorResponse(res, "Invalid credentials", 401);
  }

  // Generate tokens
  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Update last login
  await User.findByIdAndUpdate(user._id, {
    lastLoginAt: new Date(),
  });

  return successResponse(res, "Login successful", {
    user: {
      id:        user._id,
      name:      user.name,
      mobileNo:  user.mobileNo,
      role:      user.role,
      status:    user.status,
      partnerId: user.partnerId,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  });
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/auth/fcm-token
// @desc    Register or refresh FCM device token
// @access  Private
// ─────────────────────────────────────────────────────────
const updateFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;

  if (!fcmToken) {
    return errorResponse(res, "FCM token is required", 400);
  }

  await User.findByIdAndUpdate(req.user._id, {
    fcmToken,
  });

  return successResponse(res, "FCM token updated successfully");
});


module.exports = {
  sendOTP,
  verifyOTP,
  register,
  login,
  refreshToken,
  logout,
  getMe,
  getRegistrationStatus,
  internalLogin,
  updateFcmToken,
};