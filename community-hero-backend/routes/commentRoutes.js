// backend/routes/commentRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    verifyLocation
} = require("../middleware/geoGuard");

const {

    getComments,

    addComment,

    deleteComment

} = require("../controllers/commentController");

/*
=====================================================
Issue Comments
=====================================================
*/

// Get all comments of an issue
router.get(
    "/:issueId/comments",
    protect,
    getComments
);

// Add comment
router.post(
    "/:issueId/comments",
    protect,
    verifyLocation,
    addComment
);

// Delete comment
router.delete(
    "/:issueId/comments/:commentId",
    protect,
    verifyLocation,
    deleteComment
);

module.exports = router;
