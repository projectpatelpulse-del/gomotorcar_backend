const FasttagRecharge = require("../models/fasttagRecharge.model");
const Vehicle         = require("../models/vehicle.model");
const asyncHandler    = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");

// ─────────────────────────────────────────────────────────
// HELPER: Simulate FastTag third party API
// In production: replace with real NPCI API call
// ─────────────────────────────────────────────────────────
const fetchFastTagBalance = async (vehicleNo) => {
  // Simulated response — replace with real API
  // Real API: NPCI authorised aggregator
  return {
    vehicleNo,
    balance:   1240.50,
    status:    "ACTIVE",
    bankName:  "HDFC Bank",
    tagId:     `TAG${vehicleNo.slice(-4)}`,
  };
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/fasttag/balance
// @desc    Get FastTag balance for a vehicle
// @access  Private (Customer)
// Query: vehicleNo
// ─────────────────────────────────────────────────────────
const getFastTagBalance = asyncHandler(async (req, res) => {
  const { vehicleNo } = req.query;

  if (!vehicleNo) {
    return errorResponse(
      res,
      "Vehicle number is required",
      400
    );
  }

  // Fetch balance from third party API
  // Currently simulated — real API in production
  const fastTagData = await fetchFastTagBalance(
    vehicleNo.toUpperCase()
  );

  if (!fastTagData) {
    return errorResponse(
      res,
      "Could not fetch FastTag balance. Please try again.",
      503
    );
  }

  return successResponse(
    res,
    "FastTag balance fetched successfully",
    {
      vehicleNo:  fastTagData.vehicleNo,
      balance:    fastTagData.balance,
      status:     fastTagData.status,
      bankName:   fastTagData.bankName,
      tagId:      fastTagData.tagId,
      quickRechargeOptions: [200, 500, 1000, 2000],
      minAmount:  100,
      maxAmount:  10000,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/fasttag/recharge
// @desc    Recharge FastTag for a vehicle
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const rechargeFastTag = asyncHandler(async (req, res) => {
  const {
    vehicleNo,
    amount,
    paymentId,
    vehicleId,
  } = req.body;

  if (!vehicleNo || !amount) {
    return errorResponse(
      res,
      "Vehicle number and amount are required",
      400
    );
  }

  // Validate amount
  if (amount < 100 || amount > 10000) {
    return errorResponse(
      res,
      "Amount must be between ₹100 and ₹10,000",
      400
    );
  }

  // Get pre-recharge balance
  const preBalance = await fetchFastTagBalance(
    vehicleNo.toUpperCase()
  );

  // Create recharge record
  const recharge = await FasttagRecharge.create({
    customerId:         req.user._id,
    vehicleNo:          vehicleNo.toUpperCase(),
    vehicleId:          vehicleId || null,
    amount,
    preRechargeBalance: preBalance?.balance || null,
    paymentId:          paymentId || null,
    status:             paymentId ? "success" : "pending",
    postRechargeBalance: paymentId
      ? (preBalance?.balance || 0) + amount
      : null,
  });

  // If payment done — simulate third party recharge API call
  if (paymentId) {
    // In production: call real FastTag API here
    // const result = await callFastTagAPI(vehicleNo, amount)
    // Update recharge with third party reference
    recharge.thirdPartyRef = `FT${Date.now()}`;
    recharge.status        = "success";
    await recharge.save();
  }

  return createdResponse(
    res,
    paymentId
      ? "FastTag recharged successfully!"
      : "Recharge initiated. Complete payment to proceed.",
    {
      recharge: {
        _id:                recharge._id,
        vehicleNo:          recharge.vehicleNo,
        amount:             recharge.amount,
        status:             recharge.status,
        preRechargeBalance: recharge.preRechargeBalance,
        postRechargeBalance:recharge.postRechargeBalance,
        createdAt:          recharge.createdAt,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/fasttag/history
// @desc    Get FastTag recharge history
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const getFastTagHistory = asyncHandler(async (req, res) => {
  const {
    vehicleNo,
    page  = 1,
    limit = 10,
  } = req.query;

  const filter = {
    customerId: req.user._id,
    isDeleted:  false,
  };

  // Filter by vehicle if provided
  if (vehicleNo) {
    filter.vehicleNo = vehicleNo.toUpperCase();
  }

  const [recharges, total] = await Promise.all([
    FasttagRecharge.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    FasttagRecharge.countDocuments(filter),
  ]);

  // Format for UI — matches Screen 5
  const transactions = recharges.map((r) => ({
    _id:       r._id,
    vehicleNo: r.vehicleNo,
    amount:    r.amount,
    type:      "CREDIT",
    status:    r.status,
    date:      r.createdAt,
    preBalance:  r.preRechargeBalance,
    postBalance: r.postRechargeBalance,
  }));

  return successResponse(
    res,
    "FastTag history fetched successfully",
    {
      total,
      page:         parseInt(page),
      totalPages:   Math.ceil(total / parseInt(limit)),
      transactions,
    }
  );
});

module.exports = {
  getFastTagBalance,
  rechargeFastTag,
  getFastTagHistory,
};