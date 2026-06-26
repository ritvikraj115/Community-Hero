// backend/routes/issueRoutes.js

const express = require("express");
const multer = require("multer");

const router = express.Router();

const {
  protect,
  adminOnly
} = require("../middleware/auth");

const {
  verifyLocation
} = require("../middleware/geoGuard");

const {
  createIssue,
  getIssues,
  getIssueById,
  voteApproval,
  claimIssue,
  addComment,
  requestIssueHelp,
  submitResolution,
  voteResolution,
  setAdminDeadline
} = require("../controllers/issueController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed."));
    }

    return cb(null, true);
  }
});

router.post(
  "/",
  protect,
  upload.single("issueImage"),
  verifyLocation,
  createIssue
);

router.get(
  "/",
  protect,
  getIssues
);

router.get(
  "/:issueId",
  protect,
  getIssueById
);

router.post(
  "/:issueId/vote-approval",
  protect,
  voteApproval
);

router.post(
  "/:issueId/claim",
  protect,
  claimIssue
);

router.post(
  "/:issueId/comments",
  protect,
  addComment
);

router.post(
  "/:issueId/request-help",
  protect,
  requestIssueHelp
);

router.post(
  "/:issueId/resolve",
  protect,
  upload.single("resolvedImage"),
  verifyLocation,
  submitResolution
);

router.post(
  "/:issueId/vote-resolution",
  protect,
  voteResolution
);

router.put(
  "/:issueId/deadline",
  protect,
  adminOnly,
  setAdminDeadline
);

module.exports = router;
