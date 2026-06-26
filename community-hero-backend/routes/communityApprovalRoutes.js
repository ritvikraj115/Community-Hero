// backend/routes/communityApprovalRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

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
    approveIssue
);

module.exports = router;