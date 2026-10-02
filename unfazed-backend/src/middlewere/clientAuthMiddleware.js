const jwt = require("jsonwebtoken");

const clientAuthMiddleware = (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) return res.status(401).json({ message: "Client access link required" });
    const decoded = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
    if (decoded.role !== "client" || !decoded.clientId || !decoded.therapistId) {
      return res.status(403).json({ message: "Client portal access is invalid" });
    }
    req.clientAccess = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: "Client access link is invalid or expired" });
  }
};

module.exports = clientAuthMiddleware;