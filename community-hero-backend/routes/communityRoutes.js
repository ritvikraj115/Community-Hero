// backend/routes/communityRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect,
    adminOnly
} = require("../middleware/auth");

const {

    getCommunityProfile,

    updateCommunityProfile,

    getCommunitySummary

} = require("../controllers/communityController");

/*
=====================================================
Community Profile
=====================================================
*/

router.get(
    "/profile",
    protect,
    getCommunityProfile
);

/*
=====================================================
Community Summary
=====================================================
*/

router.get(
    "/summary",
    protect,
    getCommunitySummary
);

/*
=====================================================
Update Community
(Admin Only)
=====================================================
*/

router.put(
    "/profile",
    protect,
    adminOnly,
    updateCommunityProfile
);

module.exports = router;