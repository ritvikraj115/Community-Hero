// backend/utils/notificationService.js

const Notification = require("../models/Notification");
const User = require("../models/User");

/*
===========================================================
CREATE NOTIFICATION
===========================================================
*/

async function createNotification({
    recipient,
    societyId,
    issue = null,
    title,
    message,
    type = "SYSTEM",
    priority = "LOW",
    actionUrl = "",
    expiresAt = null
}) {

    return await Notification.create({

        recipient,

        societyId,

        issue,

        title,

        message,

        type,

        priority,

        actionUrl,

        expiresAt

    });

}

/*
===========================================================
SEND TO ALL RESIDENTS
===========================================================
*/

async function notifyResidents({

    societyId,

    issue = null,

    title,

    message,

    type = "SYSTEM",

    priority = "LOW",

    actionUrl = ""

}) {

    const residents = await User.find({

        societyId,

        role: "resident",

        joinStatus: "approved"

    }).select("_id");

    const notifications = residents.map(user => ({

        recipient: user._id,

        societyId,

        issue,

        title,

        message,

        type,

        priority,

        actionUrl

    }));

    if (notifications.length) {

        await Notification.insertMany(notifications);

    }

    return notifications.length;

}

/*
===========================================================
SEND TO ADMIN
===========================================================
*/

async function notifyAdmin({

    societyId,

    issue = null,

    title,

    message,

    type = "SYSTEM",

    priority = "HIGH",

    actionUrl = ""

}) {

    const admin = await User.findOne({

        societyId,

        role: "admin"

    });

    if (!admin) return null;

    return await createNotification({

        recipient: admin._id,

        societyId,

        issue,

        title,

        message,

        type,

        priority,

        actionUrl

    });

}

/*
===========================================================
SEND TO ONE USER
===========================================================
*/

async function notifyUser(
    recipient,
    title,
    message,
    type = "SYSTEM",
    options = {}
) {

    const user = await User.findById(recipient)
        .select("societyId");

    if (!user) return null;

    const societyId =
        options.societyId ||
        user.societyId;

    if (!societyId) return null;

    return await createNotification({

        recipient: user._id,

        societyId,

        issue: options.issue || null,

        title,

        message,

        type,

        priority: options.priority || "LOW",

        actionUrl: options.actionUrl || "",

        expiresAt: options.expiresAt || null

    });

}

/*
===========================================================
JOIN REQUEST
===========================================================
*/

async function sendJoinRequestNotification(

    resident,

    societyId

) {

    return await notifyAdmin({

        societyId,

        title: "New Join Request",

        message:
            `${resident.name} requested to join your community.`,

        type: "JOIN_REQUEST",

        priority: "MEDIUM"

    });

}

/*
===========================================================
JOIN APPROVED
===========================================================
*/

async function sendJoinApprovedNotification(

    resident,

    societyId

) {

    return await createNotification({

        recipient: resident._id,

        societyId,

        title: "Community Access Approved",

        message:
            "Your request has been approved. You can now participate in your community.",

        type: "JOIN_APPROVED",

        priority: "HIGH",

        actionUrl: "/dashboard"

    });

}

/*
===========================================================
NEW ISSUE
===========================================================
*/

async function sendIssueCreatedNotification(

    issue

) {

    return await notifyResidents({

        societyId: issue.societyId,

        issue: issue._id,

        title: "New Community Issue",

        message:
            issue.title,

        type: "ISSUE_CREATED",

        priority: "MEDIUM",

        actionUrl:
            `/issues/${issue._id}`

    });

}

/*
===========================================================
ISSUE APPROVED
===========================================================
*/

async function sendIssueApprovedNotification(

    issue

) {

    return await notifyResidents({

        societyId: issue.societyId,

        issue: issue._id,

        title: "Issue Approved",

        message:
            "Community voting approved a new issue.",

        type: "ISSUE_APPROVED",

        priority: "HIGH",

        actionUrl:
            `/issues/${issue._id}`

    });

}

/*
===========================================================
ISSUE CLAIMED
===========================================================
*/

async function sendIssueClaimedNotification(

    issue,

    user

) {

    return await notifyResidents({

        societyId: issue.societyId,

        issue: issue._id,

        title: "Issue Claimed",

        message:
            `${user.name} has taken responsibility.`,

        type: "ISSUE_ASSIGNED",

        priority: "LOW",

        actionUrl:
            `/issues/${issue._id}`

    });

}

/*
===========================================================
RESOLUTION SUBMITTED
===========================================================
*/

async function sendResolutionNotification(

    issue

) {

    return await notifyResidents({

        societyId: issue.societyId,

        issue: issue._id,

        title: "Resolution Waiting Verification",

        message:
            "Community verification is now required.",

        type: "RESOLUTION_PENDING",

        priority: "HIGH",

        actionUrl:
            `/issues/${issue._id}`

    });

}

/*
===========================================================
WEATHER ALERT
===========================================================
*/

async function sendWeatherAlert(

    societyId,

    title,

    message

) {

    return await notifyResidents({

        societyId,

        title,

        message,

        type: "WEATHER_ALERT",

        priority: "CRITICAL"

    });

}

module.exports = {

    createNotification,

    notifyResidents,

    notifyAdmin,

    notifyUser,

    sendJoinRequestNotification,

    sendJoinApprovedNotification,

    sendIssueCreatedNotification,

    sendIssueApprovedNotification,

    sendIssueClaimedNotification,

    sendResolutionNotification,

    sendWeatherAlert

};
