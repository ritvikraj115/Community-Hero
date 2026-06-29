// backend/controllers/insightController.js

const {
    getPersonalInsights,
    getCategoryStatistics,
    getRecurringReasons,
    getSeverityDistribution
} = require("../utils/insightAggregator");

const {
    getHistoricalSolutions
} = require("../utils/communityHistoryService");

const getPersonalInsightDashboard = async (req, res) => {

    try {

        const insights =
            await getPersonalInsights(
                req.user.id,
                req.user.societyId
            );

        res.json({
            success: true,
            insights
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

const getCommunityInsightDashboard = async (req, res) => {

    try {

        const [

            categoryStats,

            recurringReasons,

            severityDistribution

        ] = await Promise.all([

            getCategoryStatistics(
                req.user.societyId
            ),

            getRecurringReasons(
                req.user.societyId
            ),

            getSeverityDistribution(
                req.user.societyId
            )

        ]);

        res.json({

            success: true,

            categoryStats,

            recurringReasons,

            severityDistribution

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

const getHistoricalReason = async (req, res) => {

    try {

        const {

            category,

            reason

        } = req.query;

        const history =
            await getHistoricalSolutions(

                req.user.societyId,

                category,

                reason

            );

        res.json({

            success: true,

            history

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

    getPersonalInsightDashboard,

    getCommunityInsightDashboard,

    getHistoricalReason

};