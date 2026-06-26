// backend/routes/achievementRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    getMyAchievements
} = require("../controllers/achievementController");

/*
=========================================================
Achievements
Phase 4 - Gamification

Provides

• Earned Badges
• Community Milestones
• Reporting Milestones
• Resolution Milestones
• Points Progress

=========================================================
*/

router.get(
    "/",
    protect,
    getMyAchievements
);

module.exports = router;