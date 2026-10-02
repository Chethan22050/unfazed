const jwt = require("jsonwebtoken");

const createClientAccessToken = (clientId, therapistId) => jwt.sign(
  { role: "client", clientId: clientId.toString(), therapistId: therapistId.toString() },
  process.env.JWT_SECRET,
  { expiresIn: "30d" }
);

module.exports = { createClientAccessToken };