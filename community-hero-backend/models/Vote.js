// backend/models/Vote.js

const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
{
    issueId:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Issue",
        required: true,
        index: true
    },

    voter:
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

    voteType:
    {
        type: String,
        enum: [
            "INITIAL_APPROVAL",
            "RESOLUTION_APPROVAL"
        ],
        required: true
    },

    vote:
    {
        type: Boolean,
        default: true
    },

    location:
    {
        latitude: Number,
        longitude: Number
    },

    aiVerified:
    {
        type: Boolean,
        default: true
    }

},
{
    timestamps: true
});

voteSchema.index(
{
    issueId: 1,
    voter: 1,
    voteType: 1
},
{
    unique: true
});

module.exports = mongoose.model(
    "Vote",
    voteSchema
);