// backend/controllers/gamificationController.js

const User = require("../models/User");
const Leaderboard = require("../models/Leaderboard");
const UserHistory = require("../models/UserHistory");

const {
    calculateReputation
} = require("../utils/reputationService");

const getMyGamification = async (req, res) => {

    try {

        const reputation =
            await calculateReputation(
                req.user.id
            );

        const history =
            await UserHistory.find({

                user: req.user.id

            })
            .sort({
                createdAt: -1
            })
            .limit(20);

        res.json({

            success: true,

            totalPoints:
                req.user.gamificationPoints,

            reputation,

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

const getCommunityLeaderboard = async (req, res) => {

    try {

        const today = new Date();

        const month = today.getMonth() + 1;

        const year = today.getFullYear();

        const leaderboard =
            await Leaderboard.find({

                societyId:
                    req.user.societyId,

                month,

                year

            })
            .populate(
                "user",
                "name"
            )
            .sort({

                currentRank: 1

            });

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

const getResidentProfile = async (req, res) => {

    try {

        const resident =
            await User.findById(
                req.params.userId
            )
            .select(
                "name gamificationPoints createdAt"
            );

        if (!resident) {

            return res.status(404).json({

                success: false,

                error:
                    "Resident not found."

            });

        }

        const reputation =
            await calculateReputation(
                resident._id
            );

        res.json({

            success: true,

            resident,

            reputation

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

    getMyGamification,

    getCommunityLeaderboard,

    getResidentProfile

};