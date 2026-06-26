// backend/controllers/leaderboardController.js

const {
    rebuildMonthlyLeaderboard,
    getLeaderboard,
    getTopThree
} = require("../utils/leaderboardService");

const getCurrentLeaderboard = async (req, res) => {

    try {

        const today = new Date();

        const month = today.getMonth() + 1;

        const year = today.getFullYear();

        const leaderboard = await getLeaderboard(
            req.user.societyId,
            month,
            year
        );

        res.json({
            success: true,
            leaderboard
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

const rebuildLeaderboard = async (req, res) => {

    try {

        const leaderboard =
            await rebuildMonthlyLeaderboard(
                req.user.societyId
            );

        res.json({

            success: true,

            message:
                "Leaderboard rebuilt successfully.",

            leaderboard

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

const getTopResidents = async (req, res) => {

    try {

        const today = new Date();

        const month = today.getMonth() + 1;

        const year = today.getFullYear();

        const topResidents = await getTopThree(

            req.user.societyId,

            month,

            year

        );

        res.json({

            success: true,

            topResidents

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

    getCurrentLeaderboard,

    rebuildLeaderboard,

    getTopResidents

};