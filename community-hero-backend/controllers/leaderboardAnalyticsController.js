// backend/controllers/leaderboardAnalyticsController.js

const Leaderboard = require("../models/Leaderboard");
const User = require("../models/User");

/*
=========================================================
Leaderboard Analytics
Phase 4

Provides

• Monthly Leaderboard
• Top Contributors
• Contribution Distribution
• Rank Changes
• Hall Of Fame

=========================================================
*/

const getLeaderboardAnalytics = async (req, res) => {

    try {

        const today = new Date();

        const month = today.getMonth() + 1;

        const year = today.getFullYear();

        const leaderboard = await Leaderboard.find({

            societyId: req.user.societyId,

            month,

            year

        })
        .populate(
            "user",
            "name email"
        )
        .sort({

            currentRank: 1

        });

        const hallOfFame = leaderboard.slice(0, 3);

        const contributionDistribution = {

            platinum: 0,

            gold: 0,

            silver: 0,

            bronze: 0

        };

        leaderboard.forEach(entry => {

            if (entry.totalPoints >= 500)

                contributionDistribution.platinum++;

            else if (entry.totalPoints >= 250)

                contributionDistribution.gold++;

            else if (entry.totalPoints >= 100)

                contributionDistribution.silver++;

            else

                contributionDistribution.bronze++;

        });

        res.json({

            success: true,

            month,

            year,

            leaderboard,

            hallOfFame,

            contributionDistribution

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

/*
=========================================================
Top Contributors
=========================================================
*/

const getTopContributors = async (req, res) => {

    try {

        const users = await User.find({

            societyId: req.user.societyId,

            role: "resident",

            joinStatus: "approved"

        })
        .select(

            "name gamificationPoints"

        )
        .sort({

            gamificationPoints: -1

        })
        .limit(10);

        res.json({

            success: true,

            contributors: users

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

    getLeaderboardAnalytics,

    getTopContributors

};