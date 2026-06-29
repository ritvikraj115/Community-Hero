// backend/models/ResolutionVerification.js

const mongoose = require("mongoose");

const resolutionVerificationSchema = new mongoose.Schema(
{
    issue:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Issue",
        required: true,
        index: true
    },

    solver:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    societyId:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Society",
        required: true,
        index: true
    },

    beforeImage:
    {
        type: String,
        default: ""
    },

    afterImage:
    {
        type: String,
        default: ""
    },

    aiVerified:
    {
        type: Boolean,
        default: false
    },

    confidenceScore:
    {
        type: Number,
        default: 0
    },

    aiAnalysis:
    {
        type: String,
        default: ""
    },

    requiredVotePercentage:
    {
        type: Number,
        default: 50
    },

    totalEligibleVoters:
    {
        type: Number,
        default: 0
    },

    requiredVotes:
    {
        type: Number,
        default: 0
    },

    receivedVotes:
    {
        type: Number,
        default: 0
    },

    status:
    {
        type: String,
        enum:
        [
            "PENDING_AI",
            "PENDING_COMMUNITY",
            "APPROVED",
            "REJECTED"
        ],
        default: "PENDING_AI"
    },

    verifiedAt:
    {
        type: Date,
        default: null
    }

},
{
    timestamps: true
});

resolutionVerificationSchema.index({
    societyId: 1,
    status: 1
});

module.exports = mongoose.model(
    "ResolutionVerification",
    resolutionVerificationSchema
);
