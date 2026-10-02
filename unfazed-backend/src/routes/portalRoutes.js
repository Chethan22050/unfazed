const express = require("express");
const clientAuthMiddleware = require("../middlewere/clientAuthMiddleware");
const { getPortalProfile } = require("../controllers/portalController");

const router = express.Router();
router.get("/profile", clientAuthMiddleware, getPortalProfile);

module.exports = router;