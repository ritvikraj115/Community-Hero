// backend/models/Notification.js

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
{
    recipient:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
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

    issue:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Issue",
        default: null
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

    type:
    {
        type: String,
        enum:
        [
            "JOIN_REQUEST",
            "JOIN_APPROVED",
            "ISSUE",
            "ISSUE_CREATED",
            "ISSUE_DUPLICATE",
            "ISSUE_APPROVED",
            "ISSUE_CLAIMED",
            "ISSUE_ASSIGNED",
            "COMMENT",
            "DEADLINE",
            "RESOLUTION_PENDING",
            "RESOLUTION_APPROVED",
            "MAINTENANCE",
            "WEATHER_ALERT",
            "SYSTEM"
        ],
        default: "SYSTEM"
    },

    priority:
    {
        type: String,
        enum:
        [
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL"
        ],
        default: "LOW"
    },

    isRead:
    {
        type: Boolean,
        default: false
    },

    actionUrl:
    {
        type: String,
        default: ""
    },

    expiresAt:
    {
        type: Date,
        default: null
    }

},
{
    timestamps: true
});

notificationSchema.index(
{
    recipient: 1,
    isRead: 1,
    createdAt: -1
});

notificationSchema.index(
{
    societyId: 1,
    type: 1
});

module.exports = mongoose.model(
    "Notification",
    notificationSchema
);
