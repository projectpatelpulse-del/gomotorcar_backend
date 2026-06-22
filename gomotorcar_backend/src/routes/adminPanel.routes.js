const express = require("express");
const router  = express.Router();
const {
  getDashboard,
  createBanner,
  getBanners,
  getActiveBanners,
  updateBanner,
  deleteBanner,
  upsertPolicy,
  getPolicies,
  generateQRBatch,
  getQRCodes,
  assignQRToSupervisor,
  getSubscriptionsReport,
  getBookingsReport,
  getRevenueReport,
  getGrievancesReport,
  submitWebsiteQuery,
  getWebsiteQueries,
  respondToQuery,
  createApartment,
  getApartments,
  updateApartment,
  assignSupervisorToApartment,
  createCoupon,
  getCoupons,
  validateCoupon,
  updateCoupon,
  deleteCoupon,
  broadcastNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  // New imports
  getCustomers,
  getCustomerDetails,
  suspendCustomer,
  activateCustomer,
  getAdminSubscriptions,
  adminAssignCleaner,
  adminChangeSupervisor,
  adminCancelSubscription,
  getCleanerList,
  getCleanerFullProfile,
  getAllGrievances,
  resolveGrievance,
  escalateGrievance,
  addGrievanceMessage,
  getAllLeads,
  getAllPayments,
  getWalletTransactions,
  getAuditLogs,

   // New imports
  getAdminBookings,
  getAdminBookingDetails,
  updateBookingStatus,
  getSupervisorList,
  getSupervisorDetails,
  getNCSPList,
  getNCSPDetails,
  updateNCSPAppStatus,
  getFranchiseList,
  getFranchiseDetails,
  updateFranchiseAppStatus,
  getOperationsList,
  createOperationsMember,
  getAdminServices,
  updateAdminService,
  toggleService,
  getSettings,
  updateSettings,
  getAdminUsers,
  updateAdminUserStatus,
  getAdminInventory,
} = require("../controllers/admin.panel.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// ─── Admin only middleware ────────────────────────────────
const adminOnly = [
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.IT_ADMIN),
];

// ─── Any authenticated user ──────────────────────────────
const authOnly = [authenticate, requireActiveAccount];

// ─── Dashboard ────────────────────────────────────────────
router.get("/dashboard", ...adminOnly, getDashboard);

// ─── Banners ──────────────────────────────────────────────
router.post  ("/banners",        ...adminOnly, createBanner);
router.get   ("/banners",        ...adminOnly, getBanners);
router.get   ("/banners/active", ...authOnly,  getActiveBanners);
router.put   ("/banners/:id",    ...adminOnly, updateBanner);
router.delete("/banners/:id",    ...adminOnly, deleteBanner);

// ─── Policies ─────────────────────────────────────────────
router.post("/policies",  ...adminOnly, upsertPolicy);
router.get ("/policies",  ...authOnly,  getPolicies);

// ─── QR Codes ─────────────────────────────────────────────
router.post("/qr-codes/batch",         ...adminOnly, generateQRBatch);
router.get ("/qr-codes",               ...adminOnly, getQRCodes);
router.put ("/qr-codes/:id/assign",    ...adminOnly, assignQRToSupervisor);

// ─── Reports ──────────────────────────────────────────────
router.get("/reports/subscriptions",   ...adminOnly, getSubscriptionsReport);
router.get("/reports/bookings",        ...adminOnly, getBookingsReport);
router.get("/reports/revenue",         ...adminOnly, getRevenueReport);
router.get("/reports/grievances",      ...adminOnly, getGrievancesReport);

// ─── Website Queries ──────────────────────────────────────
// Public — website form submit. Use this route when no token is available.
router.post("/website/queries",           submitWebsiteQuery);
router.post("/website/queries/submit",    submitWebsiteQuery);
router.get ("/website/queries",           ...adminOnly, getWebsiteQueries);
router.post("/website/queries/:id/respond",...adminOnly, respondToQuery);

// ─── Apartments ───────────────────────────────────────────
router.post("/apartments",                    ...adminOnly, createApartment);
router.get ("/apartments",                    ...adminOnly, getApartments);
router.put ("/apartments/:id",                ...adminOnly, updateApartment);
router.put ("/apartments/:id/supervisor",     ...adminOnly, assignSupervisorToApartment);

// ─── Coupons ──────────────────────────────────────────────
router.post  ("/coupons",          ...adminOnly, createCoupon);
router.get   ("/coupons",          ...adminOnly, getCoupons);
router.post  ("/coupons/validate", ...authOnly,  validateCoupon);
router.put   ("/coupons/:id",      ...adminOnly, updateCoupon);
router.delete("/coupons/:id",      ...adminOnly, deleteCoupon);

// ─── Notifications ────────────────────────────────────────
router.post ("/notifications/broadcast",      ...adminOnly, broadcastNotification);
router.get  ("/notifications",                ...authOnly,  getUserNotifications);
router.patch("/notifications/:id/read",       ...authOnly,  markNotificationRead);
router.patch("/notifications/read-all",       ...authOnly,  markAllNotificationsRead);

// ─── Customer Management ──────────────────────────────────
router.get ("/customers",              ...adminOnly, getCustomers);
router.get ("/customers/:id",          ...adminOnly, getCustomerDetails);
router.put ("/customers/:id/suspend",  ...adminOnly, suspendCustomer);
router.put ("/customers/:id/activate", ...adminOnly, activateCustomer);

// ─── Subscription Management ──────────────────────────────
router.get ("/subscriptions",                        ...adminOnly, getAdminSubscriptions);
router.put ("/subscriptions/:id/assign-cleaner",     ...adminOnly, adminAssignCleaner);
router.put ("/subscriptions/:id/change-supervisor",  ...adminOnly, adminChangeSupervisor);
router.put ("/subscriptions/:id/cancel",             ...adminOnly, adminCancelSubscription);

// ─── Cleaner Management ───────────────────────────────────
router.get ("/cleaners",       ...adminOnly, getCleanerList);
router.get ("/cleaners/:id",   ...adminOnly, getCleanerFullProfile);

// ─── Grievance Management ─────────────────────────────────
router.get  ("/grievances",                  ...adminOnly, getAllGrievances);
router.put  ("/grievances/:id/resolve",      ...adminOnly, resolveGrievance);
router.put  ("/grievances/:id/escalate",     ...adminOnly, escalateGrievance);
router.post ("/grievances/:id/message",      ...adminOnly, addGrievanceMessage);

// ─── Lead Management ──────────────────────────────────────
router.get ("/leads", ...adminOnly, getAllLeads);

// ─── Payment Management ───────────────────────────────────
router.get ("/payments",              ...adminOnly, getAllPayments);
router.get ("/payments/wallet",       ...adminOnly, getWalletTransactions);

// ─── Audit Logs ───────────────────────────────────────────
router.get ("/audit-logs", ...adminOnly, getAuditLogs);

// ─── Booking Management ───────────────────────────────────
router.get("/bookings",              ...adminOnly, getAdminBookings);
router.get("/bookings/:id",          ...adminOnly, getAdminBookingDetails);
router.put("/bookings/:id/status",   ...adminOnly, updateBookingStatus);

// ─── Supervisor Management ────────────────────────────────
router.get("/supervisors",           ...adminOnly, getSupervisorList);
router.get("/supervisors/:id",       ...adminOnly, getSupervisorDetails);

// ─── NCSP Management ──────────────────────────────────────
router.get("/ncsp",                  ...adminOnly, getNCSPList);
router.get("/ncsp/:id",              ...adminOnly, getNCSPDetails);
router.put("/ncsp/:id/app-status",   ...adminOnly, updateNCSPAppStatus);

// ─── Franchise Management ─────────────────────────────────
router.get("/franchises",                    ...adminOnly, getFranchiseList);
router.get("/franchises/:id",                ...adminOnly, getFranchiseDetails);
router.put("/franchises/:id/app-status",     ...adminOnly, updateFranchiseAppStatus);

// ─── Operations Team ──────────────────────────────────────
router.get ("/operations",        ...adminOnly, getOperationsList);
router.post("/operations/create", ...adminOnly, createOperationsMember);

// ─── Service Management ───────────────────────────────────
router.get("/services",              ...adminOnly, getAdminServices);
router.put("/services/:id",          ...adminOnly, updateAdminService);
router.put("/services/:id/toggle",   ...adminOnly, toggleService);

// ─── Settings ─────────────────────────────────────────────
router.get("/settings",  ...adminOnly, getSettings);
router.put("/settings",  ...adminOnly, updateSettings);

// ─── Admin Users ──────────────────────────────────────────
router.get("/admin-users",               ...adminOnly, getAdminUsers);
router.put("/admin-users/:id/status",    ...adminOnly, updateAdminUserStatus);

// ─── Inventory ────────────────────────────────────────────
router.get("/inventory",  ...adminOnly, getAdminInventory);



module.exports = router;