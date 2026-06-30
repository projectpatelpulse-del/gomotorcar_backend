const express = require("express");
const router  = express.Router();
const {
  registerFCMToken,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} = require("../controllers/notification.controller");
const {
  authenticate,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");

// All notification routes — any authenticated user
router.use(authenticate, requireActiveAccount);

// ─── FCM Token ────────────────────────────────────────────
router.post("/fcm-token",    registerFCMToken);

// ─── Notification Feed ────────────────────────────────────
router.get  ("/",            getNotifications);
router.get  ("/unread-count",getUnreadCount);
router.patch("/:id/read",    markAsRead);
router.patch("/read-all",    markAllAsRead);
router.delete("/:id",        deleteNotification);

module.exports = router;