// backend/routes/historyRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {

    getMyHistory,

    getIssueHistory,

    getCommunityKnowledge,

    getReasonHistory

} = require("../controllers/historyController");

/*
=====================================================
Personal History
=====================================================
*/

router.get(
    "/me",
    protect,
    getMyHistory
);

/*
=====================================================
Issue Timeline
=====================================================
*/

router.get(
    "/issue/:issueId",
    protect,
    getIssueHistory
);

/*
=====================================================
Community Knowledge Base
=====================================================
*/

router.get(
    "/community",
    protect,
    getCommunityKnowledge
);

/*
=====================================================
Historical Similar Problems
=====================================================
Example

/history/reason?category=Drainage&reason=Blocked%20stormwater%20drain
=====================================================
*/

router.get(
    "/reason",
    protect,
    getReasonHistory
);

module.exports = router;