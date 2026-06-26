// backend/controllers/achievementController.js

const User = require("../models/User");
const Issue = require("../models/Issue");

/*
=========================================================
Achievement Controller
Phase 4 - Gamification

Awards badges based on activity.

=========================================================
*/

const getMyAchievements = async (req, res) => {

    try {

        const user = await User.findById(req.user.id);

        const [

            reported,

            resolved,

            claimed

        ] = await Promise.all([

            Issue.countDocuments({

                creator: user._id

            }),

            Issue.countDocuments({

                solver: user._id,

                status: "Resolved"

            }),

            Issue.countDocuments({

                solver: user._id

            })

        ]);

        const achievements = [];

        /*
        =========================================
        Reporting
        =========================================
        */

        if (reported >= 1)
            achievements.push({
                badge: "First Reporter",
                icon: "🥉"
            });

        if (reported >= 10)
            achievements.push({
                badge: "Community Reporter",
                icon: "🥈"
            });

        if (reported >= 50)
            achievements.push({
                badge: "Guardian Reporter",
                icon: "🥇"
            });

        /*
        =========================================
        Resolution
        =========================================
        */

        if (resolved >= 1)
            achievements.push({
                badge: "Problem Solver",
                icon: "🛠️"
            });

        if (resolved >= 10)
            achievements.push({
                badge: "Community Hero",
                icon: "⭐"
            });

        if (resolved >= 30)
            achievements.push({
                badge: "Legend",
                icon: "👑"
            });

        /*
        =========================================
        Points
        =========================================
        */

        if (user.gamificationPoints >= 100)
            achievements.push({
                badge: "Bronze Citizen",
                icon: "🥉"
            });

        if (user.gamificationPoints >= 300)
            achievements.push({
                badge: "Silver Citizen",
                icon: "🥈"
            });

        if (user.gamificationPoints >= 600)
            achievements.push({
                badge: "Gold Citizen",
                icon: "🥇"
            });

        if (user.gamificationPoints >= 1000)
            achievements.push({
                badge: "Community Champion",
                icon: "🏆"
            });

        res.json({

            success: true,

            statistics: {

                points: user.gamificationPoints,

                reported,

                claimed,

                resolved

            },

            achievements

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

    getMyAchievements

};