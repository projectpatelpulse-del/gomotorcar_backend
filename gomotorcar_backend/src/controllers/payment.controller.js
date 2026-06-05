const Payment   = require("../models/payment.model");
const Wallet    = require("../models/wallet.model");
const Booking   = require("../models/booking.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");
const crypto = require("crypto");

// ─────────────────────────────────────────────────────────
// HELPER: Verify Razorpay signature
// ─────────────────────────────────────────────────────────
const verifyRazorpaySignature = (
  orderId,
  paymentId,
  signature
) => {
  const secret = process.env.RAZORPAY_SECRET || "test_secret";
  const body   = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return expected === signature;
};

// ─────────────────────────────────────────────────────────
// @route   POST /api/payment/order
// @desc    Create Razorpay payment order
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const createPaymentOrder = asyncHandler(async (req, res) => {
  const {
    amount,
    purpose,
    referenceId,
    referenceModel,
  } = req.body;

  if (!amount || !purpose) {
    return errorResponse(
      res,
      "Amount and purpose are required",
      400
    );
  }

  // In production: call Razorpay API to create order
  // const razorpay = new Razorpay({...})
  // const order = await razorpay.orders.create({...})

  // Simulated Razorpay order for now
  const simulatedOrderId = `order_${Date.now()}_${
    Math.random().toString(36).slice(2, 8)
  }`;

  // Save payment record
  const payment = await Payment.create({
    customerId:      req.user._id,
    purpose,
    referenceId:     referenceId  || null,
    referenceModel:  referenceModel || null,
    amount,
    razorpayOrderId: simulatedOrderId,
    status:          "created",
  });

  return createdResponse(
    res,
    "Payment order created successfully",
    {
      payment: {
        _id:             payment._id,
        orderId:         simulatedOrderId,
        amount,
        currency:        "INR",
        purpose,
        // In production: pass these to Razorpay SDK on frontend
        keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_key",
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/payment/verify
// @desc    Verify Razorpay payment after completion
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const verifyPayment = asyncHandler(async (req, res) => {
  const {
    orderId,
    paymentId,
    signature,
    purpose,
    referenceId,
  } = req.body;

  // Find payment record
  const payment = await Payment.findOne({
    razorpayOrderId: orderId,
    customerId:      req.user._id,
  });

  if (!payment) {
    return errorResponse(res, "Payment record not found", 404);
  }

  // Verify signature (skip in development)
  if (process.env.NODE_ENV === "production") {
    const isValid = verifyRazorpaySignature(
      orderId,
      paymentId,
      signature
    );
    if (!isValid) {
      await Payment.findByIdAndUpdate(payment._id, {
        $set: { status: "failed" },
      });
      return errorResponse(
        res,
        "Payment verification failed",
        400
      );
    }
  }

  // Update payment as success
  await Payment.findByIdAndUpdate(payment._id, {
    $set: {
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      status:            "success",
    },
  });

  // Update reference (booking/subscription) payment status
  if (purpose === "booking" && referenceId) {
    await Booking.findByIdAndUpdate(referenceId, {
      $set: {
        paymentStatus: "success",
        paymentId,
      },
    });
  }

  return successResponse(
    res,
    "Payment verified successfully",
    {
      paymentId,
      status: "success",
      amount: payment.amount,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/payment/history
// @desc    Get payment history of customer
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const getPaymentHistory = asyncHandler(async (req, res) => {
  const {
    purpose,
    page  = 1,
    limit = 10,
  } = req.query;

  const filter = {
    customerId: req.user._id,
    isDeleted:  false,
  };

  if (purpose) filter.purpose = purpose;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Payment.countDocuments(filter),
  ]);

  return successResponse(
    res,
    "Payment history fetched successfully",
    {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      payments,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/payment/refund
// @desc    Initiate refund for a payment
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const initiateRefund = asyncHandler(async (req, res) => {
  const { paymentId, reason } = req.body;

  const payment = await Payment.findOne({
    razorpayPaymentId: paymentId,
    customerId:        req.user._id,
    status:            "success",
  });

  if (!payment) {
    return errorResponse(
      res,
      "Payment not found or not eligible for refund",
      404
    );
  }

  // In production: call Razorpay refund API
  // const refund = await razorpay.payments.refund(paymentId,{})

  const refundId = `refund_${Date.now()}`;

  await Payment.findByIdAndUpdate(payment._id, {
    $set: {
      status:       "refunded",
      refundId,
      refundAmount: payment.amount,
      refundReason: reason || "Customer requested",
      refundedAt:   new Date(),
    },
  });

  return successResponse(
    res,
    "Refund initiated successfully",
    {
      refundId,
      amount:         payment.amount,
      expectedCredit: "3-5 business days",
    }
  );
});

// ─────────────────────────────────────────────────────────
// WALLET APIs
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// @route   GET /api/payment/wallet
// @desc    Get wallet balance and details
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const getWallet = asyncHandler(async (req, res) => {
  // Find or create wallet
  let wallet = await Wallet.findOne({
    userId: req.user._id,
  });

  if (!wallet) {
    wallet = await Wallet.create({
      userId:  req.user._id,
      balance: 0,
      ledger:  [],
    });
  }

  return successResponse(
    res,
    "Wallet fetched successfully",
    {
      wallet: {
        _id:     wallet._id,
        balance: wallet.balance,
        // Last 5 transactions
        recentTransactions: wallet.ledger
          .slice(-5)
          .reverse(),
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/payment/wallet/topup
// @desc    Add money to wallet
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const topupWallet = asyncHandler(async (req, res) => {
  const { amount, paymentId } = req.body;

  if (!amount || amount < 100) {
    return errorResponse(
      res,
      "Minimum topup amount is ₹100",
      400
    );
  }

  // Find or create wallet
  let wallet = await Wallet.findOne({ userId: req.user._id });
  if (!wallet) {
    wallet = await Wallet.create({
      userId:  req.user._id,
      balance: 0,
    });
  }

  const newBalance = wallet.balance + amount;

  // Add to wallet
  await Wallet.findByIdAndUpdate(wallet._id, {
    $set:  { balance: newBalance },
    $push: {
      ledger: {
        type:         "credit",
        amount,
        purpose:      "topup",
        description:  `Wallet topup of ₹${amount}`,
        balanceAfter: newBalance,
      },
    },
  });

  return successResponse(
    res,
    "Wallet topped up successfully",
    {
      addedAmount: amount,
      newBalance,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/payment/wallet/history
// @desc    Get wallet transaction history
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const getWalletHistory = asyncHandler(async (req, res) => {
  const {
    page  = 1,
    limit = 10,
  } = req.query;

  const wallet = await Wallet.findOne({
    userId: req.user._id,
  });

  if (!wallet) {
    return successResponse(
      res,
      "Wallet history fetched",
      {
        balance: 0,
        total:   0,
        ledger:  [],
      }
    );
  }

  // Paginate ledger
  const ledger     = wallet.ledger.reverse();
  const total      = ledger.length;
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const paginated  = ledger.slice(
    startIndex,
    startIndex + parseInt(limit)
  );

  return successResponse(
    res,
    "Wallet history fetched successfully",
    {
      balance:    wallet.balance,
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      ledger:     paginated,
    }
  );
});

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
  initiateRefund,
  getWallet,
  topupWallet,
  getWalletHistory,
};