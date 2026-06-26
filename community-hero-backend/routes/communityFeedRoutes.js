// backend/routes/communityFeedRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    getCommunityFeed
} = require("../controllers/communityFeedController");

/*
=========================================================
Community Feed
=========================================================

Single chronological feed containing:

- New Issues
- Claimed Issues
- Resolved Issues
- Weather Alerts
- Maintenance Updates

=========================================================
*/

router.get(
    "/",
    protect,
    getCommunityFeed
);

module.exports = router;