const express = require("express");
const router  = express.Router();
const {
  submitNCSPProfile,
  getNCSPProfile,
  updateNCSPProfile,
} = require("../controllers/ncspProfile.controller");
const {
  authenticate,
  requireRole,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// All routes — NCSP only
router.use(authenticate, requireRole(ROLES.NCSP));

router.post("/", submitNCSPProfile);
router.get  ("/", getNCSPProfile);
router.put  ("/", updateNCSPProfile);

module.exports = router;