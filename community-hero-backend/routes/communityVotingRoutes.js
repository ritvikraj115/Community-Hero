// backend/routes/communityVotingRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {

    getVotingQueue,

    getVoteStatistics

} = require("../controllers/communityVotingController");

/*
=========================================================
Community Voting Dashboard
Phase 3
=========================================================

Returns

• Pending Approval Queue
• Pending Verification Queue
• Votes Received
• Votes Required

=========================================================
*/

router.get(
    "/queue",
    protect,
    getVotingQueue
);

/*
=========================================================
Voting Analytics
=========================================================
*/

router.get(
    "/statistics",
    protect,
    getVoteStatistics
);

module.exports = router;