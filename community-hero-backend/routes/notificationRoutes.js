// backend/routes/notificationRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {

    getMyNotifications,

    getUnreadCount,

    markAsRead,

    markAllAsRead,

    deleteNotification

} = require("../controllers/notificationController");

/*
====================================================
Notifications
====================================================
*/

router.get(
    "/",
    protect,
    getMyNotifications
);

router.get(
    "/unread-count",
    protect,
    getUnreadCount
);

router.put(
    "/mark-all-read",
    protect,
    markAllAsRead
);

router.put(
    "/:notificationId/read",
    protect,
    markAsRead
);

router.delete(
    "/:notificationId",
    protect,
    deleteNotification
);

module.exports = router;