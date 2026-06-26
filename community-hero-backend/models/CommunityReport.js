// backend/models/CommunityReport.js

const mongoose = require("mongoose");

const communityReportSchema = new mongoose.Schema(
{
    societyId:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Society",
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

    totalIssues:
    {
        type: Number,
        default: 0
    },

    resolvedIssues:
    {
        type: Number,
        default: 0
    },

    pendingIssues:
    {
        type: Number,
        default: 0
    },

    averageResolutionHours:
    {
        type: Number,
        default: 0
    },

    averageSeverity:
    {
        type: Number,
        default: 0
    },

    duplicateReportsPrevented:
    {
        type: Number,
        default: 0
    },

    activeResidents:
    {
        type: Number,
        default: 0
    },

    totalVotes:
    {
        type: Number,
        default: 0
    },

    totalComments:
    {
        type: Number,
        default: 0
    },

    topIssueCategory:
    {
        type: String,
        default: ""
    },

    fastestResolutionHours:
    {
        type: Number,
        default: 0
    },

    longestResolutionHours:
    {
        type: Number,
        default: 0
    },

    aiAccuracy:
    {
        type: Number,
        default: 0
    },

    weatherAlertsGenerated:
    {
        type: Number,
        default: 0
    }

},
{
    timestamps: true
});

communityReportSchema.index(
{
    societyId: 1,
    month: 1,
    year: 1
},
{
    unique: true
});

module.exports = mongoose.model(
    "CommunityReport",
    communityReportSchema
);