const express = require("express");
const router  = express.Router();
const {
  getFastTagBalance,
  rechargeFastTag,
  getFastTagHistory,
} = require("../controllers/fasttag.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// All FastTag routes — Customer only
router.use(
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CUSTOMER)
);

router.get  ("/balance",  getFastTagBalance);
router.post ("/recharge", rechargeFastTag);
router.get  ("/history",  getFastTagHistory);

module.exports = router;