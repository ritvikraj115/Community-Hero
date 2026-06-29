// backend/utils/auditLogger.js

const AuditLog = require("../models/AuditLog");

async function logEvent({

    actor = null,

    societyId = null,

    issue = null,

    action,

    resourceType = "SYSTEM",

    resourceId = null,

    description,

    metadata = {},

    req = null

}) {

    try {

        await AuditLog.create({

            actor,

            societyId,

            issue,

            action,

            resourceType,

            resourceId,

            description,

            metadata,

            ipAddress:
                req?.ip ||
                req?.headers?.["x-forwarded-for"] ||
                "",

            userAgent:
                req?.headers?.["user-agent"] ||
                ""

        });

    }
    catch (err) {

        console.error(
            "Audit Log Error:",
            err.message
        );

    }

}

/*
=========================================
Authentication
=========================================
*/

async function logLogin(user, req) {

    return logEvent({

        actor: user._id,

        societyId: user.societyId,

        action: "LOGIN",

        resourceType: "USER",

        resourceId: user._id,

        description:
            `${user.name} logged in.`,

        req

    });

}

async function logRegister(user, req) {

    return logEvent({

        actor: user._id,

        action: "REGISTER",

        resourceType: "USER",

        resourceId: user._id,

        description:
            `${user.name} registered.`,

        req

    });

}

/*
=========================================
Society
=========================================
*/

async function logSocietyCreated(
    user,
    society,
    req
) {

    return logEvent({

        actor: user._id,

        societyId: society._id,

        action: "CREATE_SOCIETY",

        resourceType: "SOCIETY",

        resourceId: society._id,

        description:
            "Community initialized.",

        req

    });

}

async function logJoinRequest(
    resident,
    societyId,
    req
) {

    return logEvent({

        actor: resident._id,

        societyId,

        action: "JOIN_REQUEST",

        resourceType: "USER",

        resourceId: resident._id,

        description:
            "Resident requested community access.",

        req

    });

}

async function logJoinApproval(
    admin,
    resident,
    req
) {

    return logEvent({

        actor: admin._id,

        societyId: admin.societyId,

        action: "JOIN_APPROVED",

        resourceType: "USER",

        resourceId: resident._id,

        description:
            `${resident.name} approved.`,

        req

    });

}

/*
=========================================
Issue
=========================================
*/

async function logIssueCreated(
    issue,
    req
) {

    return logEvent({

        actor: issue.creator,

        societyId: issue.societyId,

        issue: issue._id,

        action: "ISSUE_CREATED",

        resourceType: "ISSUE",

        resourceId: issue._id,

        description:
            issue.title,

        metadata: {

            category:
                issue.category,

            severity:
                issue.severityScore

        },

        req

    });

}

async function logDuplicateIssue(
    issue,
    req
) {

    return logEvent({

        actor: issue.creator,

        societyId: issue.societyId,

        issue: issue._id,

        action: "ISSUE_DUPLICATE",

        resourceType: "ISSUE",

        resourceId: issue._id,

        description:
            "Duplicate issue prevented.",

        req

    });

}

async function logClaim(
    issue,
    user,
    req
) {

    return logEvent({

        actor: user._id,

        societyId: issue.societyId,

        issue: issue._id,

        action: "ISSUE_CLAIMED",

        resourceType: "ISSUE",

        resourceId: issue._id,

        description:
            `${user.name} claimed issue.`,

        req

    });

}

async function logResolution(
    issue,
    req
) {

    return logEvent({

        actor: issue.solver,

        societyId: issue.societyId,

        issue: issue._id,

        action: "RESOLUTION_SUBMITTED",

        resourceType: "ISSUE",

        resourceId: issue._id,

        description:
            "Resolution submitted.",

        metadata: {

            confidence:
                issue.aiConfidenceScore

        },

        req

    });

}

module.exports = {

    logEvent,

    logLogin,

    logRegister,

    logSocietyCreated,

    logJoinRequest,

    logJoinApproval,

    logIssueCreated,

    logDuplicateIssue,

    logClaim,

    logResolution

};