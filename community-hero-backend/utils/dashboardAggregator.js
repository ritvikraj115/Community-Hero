// backend/utils/dashboardAggregator.js

const Issue = require("../models/Issue");
const User = require("../models/User");
const Alert = require("../models/Alert");
const MaintenanceTask = require("../models/MaintenanceTask");

async function getAdminDashboard(societyId) {

    const [
        totalResidents,
        pendingResidents,
        openIssues,
        pendingApproval,
        inProgress,
        resolved,
        maintenancePending,
        alerts
    ] = await Promise.all([

        User.countDocuments({
            societyId,
            role: "resident",
            joinStatus: "approved"
        }),

        User.countDocuments({
            pendingSocietyId: societyId,
            joinStatus: "pending"
        }),

        Issue.countDocuments({
            societyId,
            status: "Open"
        }),

        Issue.countDocuments({
            societyId,
            status: "Pending Approval"
        }),

        Issue.countDocuments({
            societyId,
            status: "In Progress"
        }),

        Issue.countDocuments({
            societyId,
            status: "Resolved"
        }),

        MaintenanceTask.countDocuments({
            societyId,
            status: {
                $in: [
                    "SCHEDULED",
                    "IN_PROGRESS",
                    "OVERDUE"
                ]
            }
        }),

        Alert.countDocuments({
            societyId,
            status: "ACTIVE"
        })

    ]);

    const recentIssues = await Issue.find({
        societyId
    })
        .sort({
            createdAt: -1
        })
        .limit(5)
        .populate("creator", "name")
        .select(
            "title category severityScore status creator createdAt"
        );

    return {

        overview: {

            totalResidents,

            pendingResidents,

            openIssues,

            pendingApproval,

            inProgress,

            resolved,

            maintenancePending,

            activeAlerts: alerts

        },

        recentIssues

    };

}

async function getResidentDashboard(
    userId,
    societyId
) {

    const [

        myCreated,

        myClaimed,

        myResolved,

        myPending,

        activeIssues,

        alerts

    ] = await Promise.all([

        Issue.countDocuments({

            creator: userId

        }),

        Issue.countDocuments({

            solver: userId

        }),

        Issue.countDocuments({

            solver: userId,

            status: "Resolved"

        }),

        Issue.countDocuments({

            creator: userId,

            status: {
                $ne: "Resolved"
            }

        }),

        Issue.countDocuments({

            societyId,

            status: {
                $in: [
                    "Open",
                    "In Progress",
                    "Pending Verification"
                ]
            }

        }),

        Alert.countDocuments({

            societyId,

            status: "ACTIVE"

        })

    ]);

    const latestCommunityIssues = await Issue.find({

        societyId,

        status: {
            $ne: "Resolved"
        }

    })
        .sort({
            createdAt: -1
        })
        .limit(5)
        .populate("creator", "name")
        .select(
            "title category severityScore status creator createdAt"
        );

    return {

        overview: {

            myCreated,

            myClaimed,

            myResolved,

            myPending,

            activeIssues,

            activeAlerts: alerts

        },

        latestCommunityIssues

    };

}

module.exports = {

    getAdminDashboard,

    getResidentDashboard

};