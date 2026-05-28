const express = require("express");
const router  = express.Router();
const {
  getAllUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  createInternalUser,
  activateUser,
  deactivateUser,
} = require("../controllers/admin.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// All admin routes — IT admin only
router.use(authenticate, requireActiveAccount, requireRole(ROLES.IT_ADMIN));

router.get  ("/users",                  getAllUsers);
router.get  ("/users/pending",          getPendingUsers);
router.post ("/users/create",           createInternalUser);
router.put  ("/users/:id/approve",      approveUser);
router.put  ("/users/:id/reject",       rejectUser);
router.put  ("/users/:id/activate",     activateUser);
router.put  ("/users/:id/deactivate",   deactivateUser);

module.exports = router;