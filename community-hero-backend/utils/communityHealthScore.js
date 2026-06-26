// backend/utils/communityHealthScore.js

const Issue = require("../models/Issue");
const User = require("../models/User");
const MaintenanceTask = require("../models/MaintenanceTask");

async function calculateCommunityHealthScore(societyId) {

    const [
        totalResidents,
        resolvedIssues,
        activeIssues,
        overdueMaintenance,
        totalMaintenance,
        avgSeverity
    ] = await Promise.all([

        User.countDocuments({
            societyId,
            role: "resident",
            joinStatus: "approved"
        }),

        Issue.countDocuments({
            societyId,
            status: "Resolved"
        }),

        Issue.countDocuments({
            societyId,
            status: {
                $in: [
                    "Open",
                    "Pending Approval",
                    "In Progress",
                    "Pending Verification"
                ]
            }
        }),

        MaintenanceTask.countDocuments({
            societyId,
            status: "OVERDUE"
        }),

        MaintenanceTask.countDocuments({
            societyId
        }),

        Issue.aggregate([
            {
                $match: {
                    societyId
                }
            },
            {
                $group: {
                    _id: null,
                    severity: {
                        $avg: "$severityScore"
                    }
                }
            }
        ])

    ]);

    const severity =
        avgSeverity.length
            ? avgSeverity[0].severity
            : 0;

    let score = 100;

    score -= activeIssues * 2;

    score -= overdueMaintenance * 5;

    score -= severity * 3;

    if (score < 0)
        score = 0;

    if (score > 100)
        score = 100;

    let grade = "A";

    if (score < 90)
        grade = "B";

    if (score < 75)
        grade = "C";

    if (score < 60)
        grade = "D";

    if (score < 40)
        grade = "F";

    return {

        score: Number(score.toFixed(2)),

        grade,

        metrics: {

            totalResidents,

            resolvedIssues,

            activeIssues,

            overdueMaintenance,

            totalMaintenance,

            averageSeverity:
                Number(severity.toFixed(2))

        }

    };

}

module.exports = {

    calculateCommunityHealthScore

};