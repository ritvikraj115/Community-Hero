// backend/controllers/historyController.js

const UserHistory = require("../models/UserHistory");
const IssueHistory = require("../models/IssueHistory");
const CommunityInsight = require("../models/CommunityInsights");

const getMyHistory = async (req, res) => {

    try {

        const history = await UserHistory.find({

            user: req.user.id

        })
        .sort({
            createdAt: -1
        })
        .populate("issue", "category status severityScore");

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

const getIssueHistory = async (req, res) => {

    try {

        const history = await IssueHistory.find({

            issue: req.params.issueId

        })
        .sort({
            createdAt: 1
        })
        .populate("performedBy", "name role");

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

const getCommunityKnowledge = async (req, res) => {

    try {

        const insights = await CommunityInsight.find({

            societyId: req.user.societyId

        })
        .sort({

            totalOccurrences: -1

        });

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

const getReasonHistory = async (req, res) => {

    try {

        const {

            category,

            reason

        } = req.query;

        const history = await CommunityInsight.find({

            societyId: req.user.societyId,

            category,

            inferredReason: reason

        });

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

    getMyHistory,

    getIssueHistory,

    getCommunityKnowledge,

    getReasonHistory

};
