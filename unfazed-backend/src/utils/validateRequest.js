const { validationResult } = require("express-validator");

const validateRequest = (req, res, next) => {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    return res.status(400).json({
      message: "Request validation failed",
      errors: result.array().map(({ path, msg }) => ({ field: path, message: msg }))
    });
  }

  return next();
};

module.exports = validateRequest;