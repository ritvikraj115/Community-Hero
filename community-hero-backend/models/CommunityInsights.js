// backend/models/CommunityInsight.js

const mongoose = require("mongoose");

const communityInsightSchema = new mongoose.Schema(
{
    societyId:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Society",
        required: true,
        index: true
    },

    category:
    {
        type: String,
        required: true
    },

    inferredReason:
    {
        type: String,
        required: true
    },

    totalOccurrences:
    {
        type: Number,
        default: 1
    },

    resolvedOccurrences:
    {
        type: Number,
        default: 0
    },

    averageResolutionHours:
    {
        type: Number,
        default: 0
    },

    lastOccurrence:
    {
        type: Date,
        default: Date.now
    },

    lastResolved:
    {
        type: Date
    },

    commonSolution:
    {
        type: String,
        default: ""
    },

    averageSeverity:
    {
        type: Number,
        default: 0
    },

    aiConfidenceAverage:
    {
        type: Number,
        default: 0
    }

},
{
    timestamps: true
});

communityInsightSchema.index({
    societyId: 1,
    category: 1
});

communityInsightSchema.index({
    societyId: 1,
    inferredReason: 1
});

module.exports = mongoose.model(
    "CommunityInsight",
    communityInsightSchema
);