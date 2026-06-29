// backend/routes/duplicateRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    verifyFreshLocation
} = require("../middleware/geoGuard");

const {
    checkDuplicateIssue
} = require("../controllers/duplicateController");

/*
=========================================================
Duplicate Detection
Phase 2 - Smart Deduplication
=========================================================
*/

router.post(
    "/check",
    protect,
    verifyFreshLocation,
    checkDuplicateIssue
);

module.exports = router;
