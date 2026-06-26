// backend/routes/reasonHistoryRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    getReasonHistory
} = require("../controllers/reasonHistoryController");

/*
=========================================================
Generalized Historical Knowledge Base
(Phase 2 Requirement)

Used immediately after issue approval.

Returns previous issues having the same

- Category
- AI Reason

along with

- How they were solved
- Solver
- Before/After Images
- AI Confidence
- Resolution Time

=========================================================
*/

router.get(
    "/:issueId",
    protect,
    getReasonHistory
);

module.exports = router;