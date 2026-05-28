const express = require("express");
const router  = express.Router();
const {
  addAddress,
  getAddresses,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} = require("../controllers/address.controller");
const {
  authenticate,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");

// All address routes are protected
router.use(authenticate, requireActiveAccount);

router.post  ("/",             addAddress);
router.get   ("/",             getAddresses);
router.put   ("/:id",          updateAddress);
router.put   ("/:id/default",  setDefaultAddress);
router.delete("/:id",          deleteAddress);

module.exports = router;