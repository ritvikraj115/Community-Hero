// backend/utils/weatherService.js

const axios = require("axios");
const Society = require("../models/Society");

const WEATHER_API =
    "https://api.openweathermap.org/data/2.5/weather";

const API_KEY = process.env.OPENWEATHER_API_KEY;

/*
==========================================================
GET WEATHER
==========================================================
*/

async function getWeather(latitude, longitude) {

    const { data } = await axios.get(WEATHER_API, {
        params: {
            lat: latitude,
            lon: longitude,
            units: "metric",
            appid: API_KEY
        }
    });

    return data;

}

/*
==========================================================
CHECK IF WEATHER IS SEVERE
==========================================================
*/

function isSevereWeather(weather) {

    const condition =
        weather.weather[0].main.toLowerCase();

    const rain =
        weather.rain?.["1h"] || 0;

    const wind =
        weather.wind.speed;

    if (
        condition.includes("thunderstorm") ||
        condition.includes("storm") ||
        rain >= 20 ||
        wind >= 15
    ) {

        return true;

    }

    return false;

}

/*
==========================================================
GENERATE COMMUNITY ALERT
==========================================================
*/

function generateAlert(weather, society) {

    const vulnerabilities =
        society.communityDetails?.knownVulnerabilities || [];

    const alerts = [];

    const condition =
        weather.weather[0].main.toLowerCase();

    if (
        condition.includes("rain") &&
        vulnerabilities.includes("Poor Drainage")
    ) {

        alerts.push({
            title: "Flood Risk",
            severity: "HIGH",
            message:
                "Heavy rainfall expected. Clear drains immediately."
        });

    }

    if (
        condition.includes("rain") &&
        vulnerabilities.includes("Basement Flooding")
    ) {

        alerts.push({
            title: "Basement Flood Warning",
            severity: "HIGH",
            message:
                "Move vehicles from basement parking."
        });

    }

    if (
        weather.wind.speed >= 15 &&
        vulnerabilities.includes("Old Trees")
    ) {

        alerts.push({
            title: "Tree Hazard",
            severity: "MEDIUM",
            message:
                "Strong winds expected. Inspect trees."
        });

    }

    return alerts;

}

/*
==========================================================
CHECK ALL SOCIETIES
==========================================================
*/

async function checkAllSocieties() {

    const societies = await Society.find({});

    const results = [];

    for (const society of societies) {

        const [lng, lat] =
            society.location.coordinates;

        const weather =
            await getWeather(lat, lng);

        const severe =
            isSevereWeather(weather);

        const alerts =
            generateAlert(weather, society);

        results.push({

            societyId: society._id,

            societyName: society.name,

            severe,

            weather,

            alerts

        });

    }

    return results;

}

module.exports = {

    getWeather,

    isSevereWeather,

    generateAlert,

    checkAllSocieties

};