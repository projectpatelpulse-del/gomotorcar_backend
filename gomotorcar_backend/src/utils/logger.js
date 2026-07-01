const fs   = require("fs");
const path = require("path");

// ─── Ensure logs directory exists ────────────────────────
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ─────────────────────────────────────────────────────────
// Simple file + console logger
// In production: replace with Winston + CloudWatch
// ─────────────────────────────────────────────────────────
const logToFile = (level, message) => {
  const timestamp = new Date().toISOString();
  const logLine   = `[${timestamp}] [${level}] ${message}\n`;

  const fileName = `${new Date().toISOString().split("T")[0]}.log`;
  const filePath = path.join(logsDir, fileName);

  fs.appendFile(filePath, logLine, (err) => {
    if (err) console.error("Logging error:", err);
  });
};

const logger = {
  info: (message) => {
    console.log(`ℹ️  ${message}`);
    logToFile("INFO", message);
  },
  error: (message) => {
    console.error(`❌ ${message}`);
    logToFile("ERROR", message);
  },
  warn: (message) => {
    console.warn(`⚠️  ${message}`);
    logToFile("WARN", message);
  },
  success: (message) => {
    console.log(`✅ ${message}`);
    logToFile("SUCCESS", message);
  },
};

module.exports = logger;