// backend/models/UserHistory.js

const mongoose = require("mongoose");

const userHistorySchema = new mongoose.Schema(
{
    user:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    issue:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Issue",
        required: true
    },

    societyId:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Society",
        required: true
    },

    action:
    {
        type: String,
        enum: [
            "ISSUE_CREATED",
            "ISSUE_APPROVED",
            "ISSUE_CLAIMED",
            "COMMENTED",
            "ISSUE_RESOLVED",
            "APPROVAL_VOTED",
            "RESOLUTION_VOTED",
            "PENALTY"
        ],
        required: true
    },

    pointsAwarded:
    {
        type: Number,
        default: 0
    },

    description:
    {
        type: String,
        default: ""
    },

    metadata:
    {
        category: String,
        severityScore: Number,
        aiConfidence: Number,
        reason: String
    }

},
{
    timestamps: true
});

userHistorySchema.index({
    user: 1,
    createdAt: -1
});

userHistorySchema.index({
    societyId: 1,
    action: 1
});

module.exports = mongoose.model(
    "UserHistory",
    userHistorySchema
);