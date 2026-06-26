// backend/controllers/weatherAlertController.js

const Alert = require("../models/Alert");
const Society = require("../models/Society");

const {
    checkAllSocieties
} = require("../utils/weatherService");

const {
    sendWeatherAlert
} = require("../utils/notificationService");

/*
=========================================================
Run AI Weather Scan
(Admin)
=========================================================
*/

const triggerWeatherMonitoring = async (req, res) => {

    try {

        const results =
            await checkAllSocieties();

        let alertsCreated = 0;

        for (const society of results) {

            if (!society.severe)
                continue;

            for (const item of society.alerts) {

                const exists =
                    await Alert.findOne({

                        societyId:
                            society.societyId,

                        title:
                            item.title,

                        status:
                            "ACTIVE"

                    });

                if (exists)
                    continue;

                await Alert.create({

                    societyId:
                        society.societyId,

                    title:
                        item.title,

                    message:
                        item.message,

                    severity:
                        item.severity,

                    generatedBy:
                        "SYSTEM",

                    status:
                        "ACTIVE"

                });

                await sendWeatherAlert(

                    society.societyId,

                    item.title,

                    item.message

                );

                alertsCreated++;

            }

        }

        res.json({

            success: true,

            scannedSocieties:
                results.length,

            alertsCreated

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
Current Active Weather Alerts
=========================================================
*/

const getActiveWeatherAlerts = async (req, res) => {

    try {

        const alerts =
            await Alert.find({

                societyId:
                    req.user.societyId,

                status: "ACTIVE",

                generatedBy: "SYSTEM"

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

/*
=========================================================
Dismiss Alert
(Admin)
=========================================================
*/

const dismissWeatherAlert = async (req, res) => {

    try {

        const alert =
            await Alert.findOne({

                _id:
                    req.params.alertId,

                societyId:
                    req.user.societyId

            });

        if (!alert) {

            return res.status(404).json({

                success: false,

                error:
                    "Alert not found."

            });

        }

        alert.status = "ARCHIVED";

        await alert.save();

        res.json({

            success: true,

            message:
                "Alert dismissed."

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

    triggerWeatherMonitoring,

    getActiveWeatherAlerts,

    dismissWeatherAlert

};