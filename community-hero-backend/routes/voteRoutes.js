// backend/routes/voteRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

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
    voteResolution
);

module.exports = router;