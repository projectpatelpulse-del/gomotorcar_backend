const express = require("express");
const router  = express.Router();
const {
  addVehicle,
  getVehicles,
  getVehicleById,
  setPrimaryVehicle,
  deleteVehicle,
} = require("../controllers/vehicle.controller");
const {
  authenticate,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");

// All vehicle routes are protected
router.use(authenticate, requireActiveAccount);

router.post  ("/",               addVehicle);
router.get   ("/",               getVehicles);
router.get   ("/:id",            getVehicleById);
router.put   ("/:id/primary",    setPrimaryVehicle);
router.delete("/:id",            deleteVehicle);

module.exports = router;