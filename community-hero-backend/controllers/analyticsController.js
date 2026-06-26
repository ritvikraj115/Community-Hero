// backend/controllers/analyticsController.js

const {
    getCommunityStatistics
} = require("../utils/communityStatistics");

const {
    getCommunityInsights
} = require("../utils/historyAggregator");

const {
    getResolutionAnalytics
} = require("../utils/resolutionAnalytics");

const {
    getSocietyInsights
} = require("../utils/societyInsights");

const {
    calculateCommunityHealthScore
} = require("../utils/communityHealthScore");

const {
    getRecurringProblems
} = require("../utils/communityHistoryService");

const getAnalyticsDashboard = async (req, res) => {

    try {

        const societyId = req.user.societyId;

        const [

            statistics,

            insights,

            resolutions,

            societyInsights,

            health,

            recurringProblems

        ] = await Promise.all([

            getCommunityStatistics(societyId),

            getCommunityInsights(societyId),

            getResolutionAnalytics(societyId),

            getSocietyInsights(societyId),

            calculateCommunityHealthScore(societyId),

            getRecurringProblems(societyId)

        ]);

        res.json({

            success: true,

            statistics,

            insights,

            resolutions,

            societyInsights,

            health,

            recurringProblems

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

const getHealthScore = async (req, res) => {

    try {

        const health = await calculateCommunityHealthScore(

            req.user.societyId

        );

        res.json({

            success: true,

            health

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

const getRecurringIssueAnalytics = async (req, res) => {

    try {

        const recurring = await getRecurringProblems(

            req.user.societyId

        );

        res.json({

            success: true,

            recurring

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

    getAnalyticsDashboard,

    getHealthScore,

    getRecurringIssueAnalytics

};