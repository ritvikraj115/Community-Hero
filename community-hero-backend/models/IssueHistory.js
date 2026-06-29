// backend/models/IssueHistory.js

const mongoose = require("mongoose");

const issueHistorySchema = new mongoose.Schema(
{
    issue:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Issue",
        required: true,
        index: true
    },

    societyId:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Society",
        required: true,
        index: true
    },

    action:
    {
        type: String,
        enum: [
            "CREATED",
            "AI_ANALYZED",
            "DUPLICATE_DETECTED",
            "PENDING_APPROVAL",
            "APPROVED",
            "CLAIMED",
            "COMMENT_ADDED",
            "DEADLINE_SET",
            "RESOLUTION_SUBMITTED",
            "AI_RESOLUTION_ANALYZED",
            "RESOLUTION_APPROVED",
            "RESOLVED",
            "REJECTED",
            "CLOSED"
        ],
        required: true
    },

    performedBy:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    previousStatus:
    {
        type: String,
        default: ""
    },

    currentStatus:
    {
        type: String,
        default: ""
    },

    notes:
    {
        type: String,
        default: ""
    },

    aiData:
    {
        category: String,
        severityScore: Number,
        inferredReason: String,
        confidenceScore: Number
    }

},
{
    timestamps: true
});

issueHistorySchema.index({
    issue: 1,
    createdAt: -1
});

issueHistorySchema.index({
    societyId: 1,
    action: 1
});

module.exports = mongoose.model(
    "IssueHistory",
    issueHistorySchema
);