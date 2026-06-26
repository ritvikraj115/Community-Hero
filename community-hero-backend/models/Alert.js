// backend/models/Alert.js

const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
{
    societyId:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Society",
        required: true
    },

    title:
    {
        type: String,
        required: true
    },

    message:
    {
        type: String,
        required: true
    },

    severity:
    {
        type: String,
        enum: [
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL"
        ],
        default: "LOW"
    },

    generatedBy:
    {
        type: String,
        enum: [
            "SYSTEM",
            "ADMIN"
        ],
        default: "SYSTEM"
    },

    relatedIssue:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Issue",
        default: null
    },

    isRead:
    {
        type: Boolean,
        default: false
    },

    status:
    {
        type: String,
        enum: [
            "ACTIVE",
            "ARCHIVED"
        ],
        default: "ACTIVE"
    },

    expiresAt:
    {
        type: Date,
        default: function ()
        {
            return new Date(
                Date.now() + 1000 * 60 * 60 * 24
            );
        }
    }

},
{
    timestamps: true
});

alertSchema.index(
{
    societyId: 1,
    status: 1
});

module.exports = mongoose.model(
    "Alert",
    alertSchema
);