// backend/controllers/reasonHistoryController.js

const Issue = require("../models/Issue");

/*
=========================================================
Phase 2 Requirement

Generalized History

After issue approval/creation the user should be able
to see previous similar problems in the society along
with how they were solved.

=========================================================
*/

const getReasonHistory = async (req, res) => {

    try {

        const issue = await Issue.findOne({

            _id: req.params.issueId,

            societyId: req.user.societyId

        });

        if (!issue) {

            return res.status(404).json({

                success: false,

                error: "Issue not found."

            });

        }

        const history = await Issue.find({

            societyId: issue.societyId,

            category: issue.category,

            inferredReason: issue.inferredReason,

            status: "Resolved",

            _id: {
                $ne: issue._id
            }

        })
        .populate("solver", "name")
        .populate("creator", "name")
        .sort({
            updatedAt: -1
        });

        const formatted = history.map(item => ({

            issueId: item._id,

            category: item.category,

            inferredReason: item.inferredReason,

            severityScore: item.severityScore,

            solvedBy: item.solver,

            reportedBy: item.creator,

            solution: item.resolutionSummary || "",

            resolutionDate: item.updatedAt,

            aiConfidence: item.aiConfidenceScore,

            beforeImage: item.mediaUrl,

            afterImage: item.resolvedMediaUrl

        }));

        res.json({

            success: true,

            currentIssue: {

                id: issue._id,

                category: issue.category,

                inferredReason:
                    issue.inferredReason

            },

            totalHistoricalCases:
                formatted.length,

            historicalSolutions:
                formatted

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

    getReasonHistory

};
