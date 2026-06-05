const express = require("express");
const router  = express.Router();
const {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
  initiateRefund,
  getWallet,
  topupWallet,
  getWalletHistory,
} = require("../controllers/payment.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// All payment routes — Customer only
router.use(
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CUSTOMER)
);

// ─── Payment Gateway ──────────────────────────────────────
router.post ("/order",        createPaymentOrder);
router.post ("/verify",       verifyPayment);
router.get  ("/history",      getPaymentHistory);
router.post ("/refund",       initiateRefund);

// ─── Wallet ───────────────────────────────────────────────
router.get  ("/wallet",         getWallet);
router.post ("/wallet/topup",   topupWallet);
router.get  ("/wallet/history", getWalletHistory);

module.exports = router;