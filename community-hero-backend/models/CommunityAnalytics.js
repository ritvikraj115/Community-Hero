// backend/models/CommunityAnalytics.js

const mongoose = require("mongoose");

const communityAnalyticsSchema = new mongoose.Schema(
{
    societyId:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Society",
        required: true,
        index: true
    },

    date:
    {
        type: Date,
        required: true,
        index: true
    },

    issueMetrics:
    {
        created:
        {
            type: Number,
            default: 0
        },

        approved:
        {
            type: Number,
            default: 0
        },

        resolved:
        {
            type: Number,
            default: 0
        },

        duplicatePrevented:
        {
            type: Number,
            default: 0
        }
    },

    votingMetrics:
    {
        approvalVotes:
        {
            type: Number,
            default: 0
        },

        resolutionVotes:
        {
            type: Number,
            default: 0
        },

        averageApprovalPercentage:
        {
            type: Number,
            default: 0
        }
    },

    aiMetrics:
    {
        averageSeverity:
        {
            type: Number,
            default: 0
        },

        averageConfidence:
        {
            type: Number,
            default: 0
        },

        duplicateDetectionRate:
        {
            type: Number,
            default: 0
        }
    },

    engagement:
    {
        activeResidents:
        {
            type: Number,
            default: 0
        },

        comments:
        {
            type: Number,
            default: 0
        },

        issueClaims:
        {
            type: Number,
            default: 0
        }
    },

    maintenance:
    {
        scheduled:
        {
            type: Number,
            default: 0
        },

        completed:
        {
            type: Number,
            default: 0
        },

        overdue:
        {
            type: Number,
            default: 0
        }
    }

},
{
    timestamps: true
});

communityAnalyticsSchema.index(
{
    societyId: 1,
    date: -1
});

module.exports = mongoose.model(
    "CommunityAnalytics",
    communityAnalyticsSchema
);