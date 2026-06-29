// backend/utils/cronJobs.js

const cron = require("node-cron");

const {
    generateOverdueMaintenanceIssues
} = require("./maintenanceScheduler");

const {
    checkAllSocieties
} = require("./weatherService");

const Alert = require("../models/Alert");

/*
==========================================================
Every Day 7 AM
Check Weather Alerts
==========================================================
*/

cron.schedule("0 7 * * *", async () => {

    console.log("Running Weather Alert Job...");

    try {

        const societies =
            await checkAllSocieties();

        for (const society of societies) {

            if (!society.severe) continue;

            for (const alert of society.alerts) {

                await Alert.create({

                    societyId: society.societyId,

                    title: alert.title,

                    message: alert.message,

                    severity: alert.severity,

                    generatedBy: "SYSTEM",

                    status: "ACTIVE"

                });

            }

        }

        console.log("Weather Alerts Generated.");

    } catch (err) {

        console.error(err);

    }

});

/*
==========================================================
Every Hour
Check Maintenance Deadlines
==========================================================
*/

cron.schedule("0 * * * *", async () => {

    console.log("Checking Maintenance Deadlines...");

    try {

        const count =
            await generateOverdueMaintenanceIssues();

        console.log(
            `${count} maintenance issues generated.`
        );

    } catch (err) {

        console.error(err);

    }

});

/*
==========================================================
Every Midnight
Archive Resolved Alerts
==========================================================
*/

cron.schedule("0 0 * * *", async () => {

    try {

        await Alert.updateMany(

            {
                status: "ACTIVE",
                expiresAt: {
                    $lte: new Date()
                }
            },

            {
                status: "ARCHIVED"
            }

        );

        console.log("Expired alerts archived.");

    } catch (err) {

        console.error(err);

    }

});

module.exports = {};