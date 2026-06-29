// backend/controllers/personalHistoryController.js

const UserHistory = require("../models/UserHistory");
const User = require("../models/User");
const Issue = require("../models/Issue");

/*
=========================================================
Phase 2 Requirement

Personalized History

Displayed immediately after issue creation.

Shows

- Reporting accuracy
- Current points
- Leaderboard rank
- Recent activity

=========================================================
*/

const getPersonalHistory = async (req, res) => {

    try {

        const user = await User.findById(req.user.id);

        const history = await UserHistory.find({

            user: req.user.id

        })
        .populate("issue")
        .sort({
            createdAt: -1
        })
        .limit(20);

        const leaderboard = await User.find({

            societyId: user.societyId,

            role: "resident",

            joinStatus: "approved"

        })
        .sort({
            gamificationPoints: -1
        })
        .select("name gamificationPoints");

        let rank = 0;

        leaderboard.forEach((resident, index) => {

            if (
                resident._id.toString() ===
                user._id.toString()
            ) {

                rank = index + 1;

            }

        });

        const [

            totalReported,

            resolvedReported

        ] = await Promise.all([

            Issue.countDocuments({

                creator: user._id

            }),

            Issue.countDocuments({

                creator: user._id,

                status: "Resolved"

            })

        ]);

        const accuracy =

            totalReported === 0

                ? 0

                : Number(

                    (
                        (resolvedReported /
                            totalReported) *
                        100
                    ).toFixed(1)

                );

        res.json({

            success: true,

            profile: {

                name: user.name,

                points:
                    user.gamificationPoints,

                leaderboardRank: rank,

                reportingAccuracy:
                    accuracy,

                totalReported,

                resolvedReported

            },

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

    getPersonalHistory

};