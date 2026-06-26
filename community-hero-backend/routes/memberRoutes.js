// backend/routes/memberRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {

    getCommunityMembers,

    getMemberProfile

} = require("../controllers/memberController");

/*
=====================================================
Community Members
=====================================================
*/

// All approved members in the community
router.get(
    "/",
    protect,
    getCommunityMembers
);

// Individual member profile
router.get(
    "/:memberId",
    protect,
    getMemberProfile
);

module.exports = router;