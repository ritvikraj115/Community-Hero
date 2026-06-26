// backend/utils/leaderboardAggregator.js

const User = require("../models/User");
const Issue = require("../models/Issue");

async function generateLeaderboard(societyId) {

    const residents = await User.find({
        societyId,
        role: "resident"
    }).select("name gamificationPoints");

    const leaderboard = [];

    for (const resident of residents) {

        const [
            created,
            resolved,
            claimed,
            votes,
            comments
        ] = await Promise.all([

            Issue.countDocuments({
                creator: resident._id
            }),

            Issue.countDocuments({
                solver: resident._id,
                status: "Resolved"
            }),

            Issue.countDocuments({
                solver: resident._id
            }),

            Issue.aggregate([
                {
                    $match: {
                        currentVotes: resident._id
                    }
                },
                {
                    $count: "votes"
                }
            ]),

            Issue.aggregate([
                {
                    $match: {
                        "comments.user": resident._id
                    }
                },
                {
                    $project: {
                        comments: {
                            $filter: {
                                input: "$comments",
                                as: "comment",
                                cond: {
                                    $eq: [
                                        "$$comment.user",
                                        resident._id
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        total: {
                            $size: "$comments"
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        comments: {
                            $sum: "$total"
                        }
                    }
                }
            ])

        ]);

        leaderboard.push({

            userId: resident._id,

            name: resident.name,

            totalPoints:
                resident.gamificationPoints,

            issuesCreated: created,

            issuesClaimed: claimed,

            issuesResolved: resolved,

            votesCast:
                votes.length
                    ? votes[0].votes
                    : 0,

            comments:
                comments.length
                    ? comments[0].comments
                    : 0

        });

    }

    leaderboard.sort(
        (a, b) =>
            b.totalPoints -
            a.totalPoints
    );

    leaderboard.forEach(
        (user, index) => {

            user.rank = index + 1;

        }
    );

    return leaderboard;

}

module.exports = {

    generateLeaderboard

};