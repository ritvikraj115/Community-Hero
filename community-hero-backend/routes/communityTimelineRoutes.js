// backend/routes/communityTimelineRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    getCommunityTimeline
} = require("../controllers/communityTimelineController");

/*
=========================================================
Community Timeline
(Hackathon Demo Feature)

Displays chronological activity:

• Maintenance Scheduled
• Issue Created
• Community Approved
• Responsibility Taken
• Resolution Submitted
• Community Verified
• Issue Resolved
• Weather Alerts

=========================================================
*/

router.get(
    "/",
    protect,
    getCommunityTimeline
);

module.exports = router;