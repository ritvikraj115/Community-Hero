// backend/controllers/communityFeedController.js

const Issue = require("../models/Issue");
const Alert = require("../models/Alert");
const MaintenanceTask = require("../models/MaintenanceTask");

const getCommunityFeed = async (req, res) => {

    try {

        const societyId = req.user.societyId;

        const [

            issues,

            alerts,

            maintenance

        ] = await Promise.all([

            Issue.find({

                societyId

            })
            .populate("creator", "name")
            .populate("solver", "name")
            .sort({
                updatedAt: -1
            })
            .limit(15),

            Alert.find({

                societyId,

                status: "ACTIVE"

            })
            .sort({
                createdAt: -1
            })
            .limit(10),

            MaintenanceTask.find({

                societyId,

                status: {

                    $ne: "COMPLETED"

                }

            })
            .sort({

                deadline: 1

            })
            .limit(10)

        ]);

        const feed = [];

        issues.forEach(issue => {

            feed.push({

                type: "ISSUE",

                date: issue.updatedAt,

                data: issue

            });

        });

        alerts.forEach(alert => {

            feed.push({

                type: "ALERT",

                date: alert.createdAt,

                data: alert

            });

        });

        maintenance.forEach(task => {

            feed.push({

                type: "MAINTENANCE",

                date: task.createdAt,

                data: task

            });

        });

        feed.sort(

            (a, b) =>

                new Date(b.date) -

                new Date(a.date)

        );

        res.json({

            success: true,

            feed

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

    getCommunityFeed

};