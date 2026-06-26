// backend/routes/personalHistoryRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    getPersonalHistory
} = require("../controllers/personalHistoryController");

/*
=========================================================
Personal Performance Dashboard
(Phase 2 Requirement)

Immediately after issue approval user sees

• Reporting Accuracy
• Leaderboard Rank
• Community Points
• Recent Contributions
• Personal History

=========================================================
*/

router.get(
    "/",
    protect,
    getPersonalHistory
);

module.exports = router;