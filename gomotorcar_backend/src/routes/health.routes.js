const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────
// @route   GET /api/health
// @desc    Health check for load balancer / monitoring
// @access  Public
// ─────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1
    ? "connected"
    : "disconnected";

  const healthCheck = {
    success:   true,
    status:    "OK",
    uptime:    `${Math.floor(process.uptime())} seconds`,
    timestamp: new Date().toISOString(),
    database:  dbStatus,
    memory: {
      used: `${Math.round(
        process.memoryUsage().heapUsed / 1024 / 1024
      )} MB`,
    },
    environment: process.env.NODE_ENV || "development",
  };

  const statusCode = dbStatus === "connected" ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

module.exports = router;