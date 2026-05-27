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
  const { mobileNo } = req.body;

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
  // New login invalidates previous session
  const sessionToken = crypto.randomBytes(32).toString("hex");

  // Update last login and session token
  await User.findByIdAndUpdate(user._id, {
    lastLoginAt:  new Date(),
    sessionToken: SINGLE_SESSION_ROLES.includes(user.role)
      ? sessionToken
      : user.sessionToken,
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

module.exports = {
  sendOTP,
  verifyOTP,
  register,
  login,
  refreshToken,
  logout,
  getMe,
};