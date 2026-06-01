const express = require("express");
const router  = express.Router();
const {
  bookDemo,
  subscribe,
  getActiveSubscription,
  getCleaningBalance,
  renewSubscription,
  getSubscriptionHistory,
  changeStaffRequest,
} = require("../controllers/subscription.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// All subscription routes — Customer only
router.use(
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CUSTOMER)
);

router.post   ("/book-demo",    bookDemo);
router.post   ("/subscribe",    subscribe);
router.get    ("/active",       getActiveSubscription);
router.get    ("/balance",      getCleaningBalance);
router.post   ("/renew",        renewSubscription);
router.get    ("/history",      getSubscriptionHistory);
router.post   ("/change-staff", changeStaffRequest);

module.exports = router;