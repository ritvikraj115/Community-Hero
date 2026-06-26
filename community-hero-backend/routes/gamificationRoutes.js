// backend/routes/gamificationRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {

    getMyGamification,

    getCommunityLeaderboard,

    getResidentProfile

} = require("../controllers/gamificationController");

/*
=========================================================
My Gamification Dashboard
=========================================================
*/

router.get(
    "/me",
    protect,
    getMyGamification
);

/*
=========================================================
Community Leaderboard
=========================================================
*/

router.get(
    "/leaderboard",
    protect,
    getCommunityLeaderboard
);

/*
=========================================================
Resident Reputation Profile
=========================================================
*/

router.get(
    "/resident/:userId",
    protect,
    getResidentProfile
);

module.exports = router;