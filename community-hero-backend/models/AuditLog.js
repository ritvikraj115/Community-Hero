// backend/models/AuditLog.js

const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
{
    actor:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true
    },

    societyId:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Society",
        default: null,
        index: true
    },

    issue:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Issue",
        default: null
    },

    action:
    {
        type: String,
        required: true,
        enum:
        [
            "REGISTER",
            "LOGIN",
            "CREATE_SOCIETY",
            "JOIN_REQUEST",
            "JOIN_APPROVED",
            "JOIN_REJECTED",
            "ISSUE_CREATED",
            "ISSUE_DUPLICATE",
            "ISSUE_APPROVED",
            "ISSUE_CLAIMED",
            "COMMENT_ADDED",
            "DEADLINE_SET",
            "RESOLUTION_SUBMITTED",
            "RESOLUTION_APPROVED",
            "RESOLUTION_REJECTED",
            "POINTS_AWARDED",
            "POINTS_DEDUCTED",
            "WEATHER_ALERT",
            "SYSTEM"
        ]
    },

    resourceType:
    {
        type: String,
        enum:
        [
            "USER",
            "ISSUE",
            "SOCIETY",
            "COMMENT",
            "ALERT",
            "SYSTEM"
        ],
        default: "SYSTEM"
    },

    resourceId:
    {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },

    description:
    {
        type: String,
        required: true
    },

    metadata:
    {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    ipAddress:
    {
        type: String,
        default: ""
    },

    userAgent:
    {
        type: String,
        default: ""
    }

},
{
    timestamps: true
});

auditLogSchema.index({
    createdAt: -1
});

auditLogSchema.index({
    actor: 1,
    createdAt: -1
});

auditLogSchema.index({
    societyId: 1,
    createdAt: -1
});

module.exports = mongoose.model(
    "AuditLog",
    auditLogSchema
);