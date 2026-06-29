// backend/routes/weatherRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect,
    adminOnly
} = require("../middleware/auth");

const {

    getSocietyWeather,

    getWeatherAlerts,

    runWeatherScan

} = require("../controllers/weatherController");

/*
=====================================================
Current Weather
=====================================================
*/

router.get(
    "/current",
    protect,
    getSocietyWeather
);

/*
=====================================================
Weather Alerts
=====================================================
*/

router.get(
    "/alerts",
    protect,
    getWeatherAlerts
);

/*
=====================================================
Manual Weather Scan (Admin)
=====================================================
*/

router.post(
    "/scan",
    protect,
    adminOnly,
    runWeatherScan
);

module.exports = router;