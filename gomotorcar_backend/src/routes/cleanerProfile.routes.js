const express = require("express");
const router  = express.Router();
const {
  submitCleanerProfile,
  getCleanerProfile,
  updateCleanerProfile,
} = require("../controllers/cleanerProfile.controller");
const {
  authenticate,
  requireRole,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// All routes — Car Cleaner only
router.use(authenticate, requireRole(ROLES.CAR_CLEANER));

router.post("/", submitCleanerProfile);
router.get  ("/", getCleanerProfile);
router.put  ("/", updateCleanerProfile);

module.exports = router;