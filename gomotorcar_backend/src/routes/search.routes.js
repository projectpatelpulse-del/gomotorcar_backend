const express = require("express");
const router  = express.Router();
const {
  getSearchCategories,
  searchServices,
  getProviders,
  getProviderById,
  logContact,
  rateProvider,
  getElectricVehicleProviders,
  getSOSProviders,
} = require("../controllers/search.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// All search routes — Customer only
router.use(
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CUSTOMER)
);

router.get  ("/categories",          getSearchCategories);
router.get  ("/services",            searchServices);
router.get  ("/providers",           getProviders);
router.get  ("/providers/:id",       getProviderById);
router.post ("/contact",             logContact);
router.post ("/providers/:id/rate",  rateProvider);
router.get  ("/electric-vehicles",   getElectricVehicleProviders);
router.get  ("/sos",                 getSOSProviders);

module.exports = router;