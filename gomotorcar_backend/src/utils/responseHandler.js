// Consistent API response format across entire project
// Every controller uses ONLY these methods — no raw res.json() calls

const successResponse = (res, message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message,
  };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

const errorResponse = (res, message, statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message,
  };
  if (errors !== null) response.errors = errors;
  return res.status(statusCode).json(response);
};

const createdResponse = (res, message, data = null) => {
  return successResponse(res, message, data, 201);
};

module.exports = {
  successResponse,
  errorResponse,
  createdResponse,
};