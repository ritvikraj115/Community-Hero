// backend/routes/voteRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    verifyLocation
} = require("../middleware/geoGuard");

const {

    voteInitialApproval,

    voteResolution

} = require("../controllers/voteController");

/*
=====================================================
Community Approval Voting
=====================================================
*/

router.post(
    "/:issueId/approval",
    protect,
    verifyLocation,
    voteInitialApproval
);

/*
=====================================================
Resolution Verification Voting
=====================================================
*/

router.post(
    "/:issueId/resolution",
    protect,
    verifyLocation,
    voteResolution
);

module.exports = router;
