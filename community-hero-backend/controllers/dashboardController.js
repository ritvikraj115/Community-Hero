// backend/controllers/dashboardController.js

const User = require("../models/User");
const Issue = require("../models/Issue");
const Alert = require("../models/Alert");
const MaintenanceTask = require("../models/MaintenanceTask");

const {
    getAdminDashboard,
    getResidentDashboard
} = require("../utils/dashboardAggregator");

const {
    getCommunityStatistics
} = require("../utils/communityStatistics");

const {
    getPersonalInsights
} = require("../utils/insightAggregator");

const {
    getSocietyInsights
} = require("../utils/societyInsights");

const {
    calculateCommunityHealthScore
} = require("../utils/communityHealthScore");

const {
    generateLeaderboard
} = require("../utils/leaderboardAggregator");

const getDashboard = async (req, res) => {

    try {

        const user = await User.findById(req.user.id);

        if (!user)
            return res.status(404).json({
                error: "User not found."
            });

        if (!user.societyId)
            return res.status(400).json({
                error: "User is not part of any community."
            });

        let dashboard;

        if (user.role === "admin") {

            dashboard = await getAdminDashboard(
                user.societyId
            );

        }
        else {

            dashboard = await getResidentDashboard(
                user._id,
                user.societyId
            );

        }

        return res.json(dashboard);

    }
    catch (err) {

        console.error(err);

        return res.status(500).json({
            error: "Dashboard loading failed."
        });

    }

};

const getCommunityOverview = async (req, res) => {

    try {

        const statistics =
            await getCommunityStatistics(
                req.user.societyId
            );

        const health =
            await calculateCommunityHealthScore(
                req.user.societyId
            );

        const insights =
            await getSocietyInsights(
                req.user.societyId
            );

        res.json({

            statistics,

            health,

            insights

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Failed to load overview."
        });

    }

};

const getPersonalDashboard = async (req, res) => {

    try {

        const insights =
            await getPersonalInsights(

                req.user.id,

                req.user.societyId

            );

        const myIssues =
            await Issue.find({

                creator: req.user.id

            })
            .sort({
                createdAt: -1
            })
            .limit(10);

        res.json({

            insights,

            myIssues

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Failed."
        });

    }

};

const getLeaderboardData = async (req, res) => {

    try {

        const leaderboard =
            await generateLeaderboard(
                req.user.societyId
            );

        res.json(leaderboard);

    }
    catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Leaderboard failed."
        });

    }

};

const getAlerts = async (req, res) => {

    try {

        const alerts =
            await Alert.find({

                societyId: req.user.societyId,

                status: "ACTIVE"

            })
            .sort({
                createdAt: -1
            });

        res.json(alerts);

    }
    catch (err) {

        res.status(500).json({
            error: "Unable to load alerts."
        });

    }

};

const getMaintenance = async (req, res) => {

    try {

        const tasks =
            await MaintenanceTask.find({

                societyId: req.user.societyId

            })
            .sort({
                deadline: 1
            });

        res.json(tasks);

    }
    catch (err) {

        res.status(500).json({
            error: "Unable to load maintenance."
        });

    }

};

module.exports = {

    getDashboard,

    getCommunityOverview,

    getPersonalDashboard,

    getLeaderboardData,

    getAlerts,

    getMaintenance

};