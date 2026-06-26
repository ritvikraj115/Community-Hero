// backend/routes/leaderboardRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect,
    adminOnly
} = require("../middleware/auth");

const {

    getCurrentLeaderboard,

    rebuildLeaderboard,

    getTopResidents

} = require("../controllers/leaderboardController");

/*
=====================================================
Community Leaderboard
=====================================================
*/

// Resident/Admin
router.get(
    "/",
    protect,
    getCurrentLeaderboard
);

// Top 3 Card
router.get(
    "/top",
    protect,
    getTopResidents
);

// Admin Manual Rebuild
router.post(
    "/rebuild",
    protect,
    adminOnly,
    rebuildLeaderboard
);

module.exports = router;