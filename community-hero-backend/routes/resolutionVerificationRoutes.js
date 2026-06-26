// backend/routes/resolutionVerificationRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {

    getPendingVerifications,

    verifyResolution

} = require("../controllers/resolutionVerificationController");

/*
=========================================================
Resolution Verification Queue
Phase 3 Requirement
=========================================================
*/

// Pending community verification queue
router.get(
    "/pending",
    protect,
    getPendingVerifications
);

// Community resolution verification vote
router.post(
    "/:issueId/vote",
    protect,
    verifyResolution
);

module.exports = router;