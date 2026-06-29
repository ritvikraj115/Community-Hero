// backend/routes/communityApprovalRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    verifyLocation
} = require("../middleware/geoGuard");

const {

    getPendingApprovalQueue,

    approveIssue

} = require("../controllers/communityApprovalController");

/*
=========================================================
Community Approval Queue
Phase 2 Requirement
=========================================================
*/

// All pending issues awaiting 20% approval
router.get(
    "/pending",
    protect,
    getPendingApprovalQueue
);

// Resident approval vote
router.post(
    "/:issueId/vote",
    protect,
    verifyLocation,
    approveIssue
);

module.exports = router;
