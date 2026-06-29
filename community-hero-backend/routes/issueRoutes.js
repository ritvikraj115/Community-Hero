// backend/routes/issueRoutes.js

const express = require("express");
const multer = require("multer");

const router = express.Router();

const {
  protect,
  adminOnly
} = require("../middleware/auth");

const {
  verifyLocation,
  verifyFreshLocation,
  verifyResolutionLocation
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

const SUPPORTED_UPLOAD_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!SUPPORTED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPG, JPEG, PNG, WEBP, HEIC, or HEIF image uploads are allowed."));
    }

    return cb(null, true);
  }
});

const uploadImage = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (error) => {
    if (!error) return next();

    return res.status(400).json({
      error: error.message || "Image upload failed."
    });
  });
};

router.post(
  "/",
  protect,
  uploadImage("issueImage"),
  verifyFreshLocation,
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
  verifyLocation,
  voteApproval
);

router.post(
  "/:issueId/claim",
  protect,
  verifyLocation,
  claimIssue
);

router.post(
  "/:issueId/comments",
  protect,
  verifyLocation,
  addComment
);

router.post(
  "/:issueId/request-help",
  protect,
  verifyLocation,
  requestIssueHelp
);

router.post(
  "/:issueId/resolve",
  protect,
  uploadImage("resolvedImage"),
  verifyResolutionLocation,
  submitResolution
);

router.post(
  "/:issueId/vote-resolution",
  protect,
  verifyLocation,
  voteResolution
);

router.put(
  "/:issueId/deadline",
  protect,
  adminOnly,
  setAdminDeadline
);

module.exports = router;
