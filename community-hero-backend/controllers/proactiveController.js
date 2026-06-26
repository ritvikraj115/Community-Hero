// backend/controllers/proactiveController.js

const Society = require("../models/Society");
const Alert = require("../models/Alert");

const {
    checkAllSocieties
} = require("../utils/weatherService");

const {
    sendWeatherAlert
} = require("../utils/notificationService");

/*
=========================================================
Run Proactive Weather Intelligence
(Admin Manual Trigger)
=========================================================
*/

const runProactiveScan = async (req, res) => {

    try {

        const results =
            await checkAllSocieties();

        let generated = 0;

        for (const society of results) {

            if (!society.severe)
                continue;

            for (const weatherAlert of society.alerts) {

                const exists =
                    await Alert.findOne({

                        societyId:
                            society.societyId,

                        title:
                            weatherAlert.title,

                        status:
                            "ACTIVE"

                    });

                if (exists)
                    continue;

                await Alert.create({

                    societyId:
                        society.societyId,

                    title:
                        weatherAlert.title,

                    message:
                        weatherAlert.message,

                    severity:
                        weatherAlert.severity,

                    generatedBy:
                        "SYSTEM",

                    status:
                        "ACTIVE"

                });

                await sendWeatherAlert(

                    society.societyId,

                    weatherAlert.title,

                    weatherAlert.message

                );

                generated++;

            }

        }

        res.json({

            success: true,

            alertsGenerated:
                generated,

            scannedSocieties:
                results.length

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

/*
=========================================================
Community Active Alerts
=========================================================
*/

const getCommunityAlerts = async (req, res) => {

    try {

        const alerts =
            await Alert.find({

                societyId:
                    req.user.societyId,

                status:
                    "ACTIVE"

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

module.exports = {

    runProactiveScan,

    getCommunityAlerts

};