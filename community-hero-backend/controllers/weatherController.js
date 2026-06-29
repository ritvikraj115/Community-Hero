// backend/controllers/weatherController.js

const {
    checkAllSocieties,
    getWeather
} = require("../utils/weatherService");

const Society = require("../models/Society");
const Alert = require("../models/Alert");

const getSocietyWeather = async (req, res) => {

    try {

        const society = await Society.findById(
            req.user.societyId
        );

        if (!society) {

            return res.status(404).json({

                success: false,

                error: "Society not found."

            });

        }

        const [lng, lat] =
            society.location.coordinates;

        const weather =
            await getWeather(lat, lng);

        res.json({

            success: true,

            weather

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

};

const getWeatherAlerts = async (req, res) => {

    try {

        const alerts =
            await Alert.find({

                societyId:
                    req.user.societyId,

                status: "ACTIVE"

            })
            .sort({
                createdAt: -1
            });

        res.json({

            success: true,

            alerts

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

};

const runWeatherScan = async (req, res) => {

    try {

        const result =
            await checkAllSocieties();

        res.json({

            success: true,

            societiesChecked:
                result.length,

            result

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

};

module.exports = {

    getSocietyWeather,

    getWeatherAlerts,

    runWeatherScan

};