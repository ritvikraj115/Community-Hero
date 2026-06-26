// backend/controllers/communityTimelineController.js

const Issue = require("../models/Issue");
const MaintenanceTask = require("../models/MaintenanceTask");
const Alert = require("../models/Alert");

/*
=========================================================
Community Timeline
(Hackathon Timeline View)

Combines

• Maintenance Events
• Issue Created
• Issue Approved
• Issue Claimed
• Resolution Submitted
• Issue Resolved
• Weather Alerts

=========================================================
*/

const getCommunityTimeline = async (req, res) => {

    try {

        const societyId = req.user.societyId;

        const [

            issues,

            maintenance,

            alerts

        ] = await Promise.all([

            Issue.find({

                societyId

            })
            .populate("creator", "name")
            .populate("solver", "name"),

            MaintenanceTask.find({

                societyId

            }),

            Alert.find({

                societyId

            })

        ]);

        const timeline = [];

        issues.forEach(issue => {

            timeline.push({

                type: "ISSUE_CREATED",

                date: issue.createdAt,

                title: issue.category,

                description: issue.inferredReason,

                status: issue.status,

                user: issue.creator?.name || "",

                issueId: issue._id

            });

            if (issue.solver) {

                timeline.push({

                    type: "ISSUE_CLAIMED",

                    date: issue.updatedAt,

                    title: issue.category,

                    description: `${issue.solver.name} accepted responsibility.`,

                    issueId: issue._id

                });

            }

            if (issue.status === "Resolved") {

                timeline.push({

                    type: "ISSUE_RESOLVED",

                    date: issue.updatedAt,

                    title: issue.category,

                    description: "Issue resolved successfully.",

                    issueId: issue._id

                });

            }

        });

        maintenance.forEach(task => {

            timeline.push({

                type: "MAINTENANCE",

                date: task.scheduledDate,

                title: task.title,

                description: task.category,

                taskId: task._id

            });

        });

        alerts.forEach(alert => {

            timeline.push({

                type: "WEATHER_ALERT",

                date: alert.createdAt,

                title: alert.title,

                description: alert.message,

                severity: alert.severity

            });

        });

        timeline.sort(

            (a, b) =>

                new Date(b.date) -

                new Date(a.date)

        );

        res.json({

            success: true,

            timeline

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

    getCommunityTimeline

};