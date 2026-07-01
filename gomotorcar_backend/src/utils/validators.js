// ─────────────────────────────────────────────────────────
// Reusable validation helpers
// ─────────────────────────────────────────────────────────

const isValidMobile = (mobile) => {
  return /^[6-9]\d{9}$/.test(mobile);
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

const isValidGST = (gst) => {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    .test(gst);
};

const sanitizeString = (str) => {
  if (typeof str !== "string") return str;
  return str.trim().replace(/<script.*?>.*?<\/script>/gi, "");
};

module.exports = {
  isValidMobile,
  isValidEmail,
  isValidObjectId,
  isValidGST,
  sanitizeString,
};