// backend/routes/societyRoutes.js

const express = require("express");

const router = express.Router();

const {
  protect,
  adminOnly
} = require("../middleware/auth");

const {
  createSociety,
  verifySocietyLocation,
  requestJoinSociety,
  approveResident,
  getPendingResidents,
  getCommunityMembers
} = require("../controllers/societyController");

router.post(
  "/",
  protect,
  adminOnly,
  createSociety
);

router.post(
  "/request-join",
  protect,
  requestJoinSociety
);

router.post(
  "/verify-location",
  protect,
  verifySocietyLocation
);

router.get(
  "/pending-residents",
  protect,
  adminOnly,
  getPendingResidents
);

router.get(
  "/members",
  protect,
  getCommunityMembers
);

router.post(
  "/approve-resident",
  protect,
  adminOnly,
  approveResident
);

module.exports = router;
