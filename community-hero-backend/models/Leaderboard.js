// backend/models/Leaderboard.js

const mongoose = require("mongoose");

const leaderboardSchema = new mongoose.Schema(
{
    societyId:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Society",
        required: true,
        index: true
    },

    user:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    month:
    {
        type: Number,
        required: true
    },

    year:
    {
        type: Number,
        required: true
    },

    issueCreatedPoints:
    {
        type: Number,
        default: 0
    },

    issueClaimPoints:
    {
        type: Number,
        default: 0
    },

    issueResolutionPoints:
    {
        type: Number,
        default: 0
    },

    votingPoints:
    {
        type: Number,
        default: 0
    },

    penaltyPoints:
    {
        type: Number,
        default: 0
    },

    totalPoints:
    {
        type: Number,
        default: 0
    },

    issuesCreated:
    {
        type: Number,
        default: 0
    },

    issuesResolved:
    {
        type: Number,
        default: 0
    },

    issuesClaimed:
    {
        type: Number,
        default: 0
    },

    votesCast:
    {
        type: Number,
        default: 0
    },

    currentRank:
    {
        type: Number,
        default: 0
    }

},
{
    timestamps: true
});

leaderboardSchema.index(
{
    societyId: 1,
    month: 1,
    year: 1,
    totalPoints: -1
});

leaderboardSchema.index(
{
    user: 1,
    month: 1,
    year: 1
},
{
    unique: true
});

module.exports = mongoose.model(
    "Leaderboard",
    leaderboardSchema
);