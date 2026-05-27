// Wraps async controller functions so we don't need
// try/catch in every single controller
// Usage: router.get("/", asyncHandler(myController))

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;