const express = require("express");
const { getPublicTherapist } = require("../controllers/therapistController");

const router = express.Router();

router.get("/:slug", getPublicTherapist);

module.exports = router;