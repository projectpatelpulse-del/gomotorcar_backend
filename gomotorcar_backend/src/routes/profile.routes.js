const express = require("express");
const router  = express.Router();
const {
  getProfile,
  updateProfile,
  updateProfilePicture,
  getProfileStats,
} = require("../controllers/profile.controller");
const {
  authenticate,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");

// All profile routes are protected
router.use(authenticate, requireActiveAccount);

router.get  ("/",        getProfile);
router.put  ("/",        updateProfile);
router.put  ("/picture", updateProfilePicture);
router.get  ("/stats",   getProfileStats);

module.exports = router;