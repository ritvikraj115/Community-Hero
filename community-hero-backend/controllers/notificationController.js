// backend/controllers/notificationController.js

const Notification = require("../models/Notification");

const getMyNotifications = async (req, res) => {

    try {

        const notifications = await Notification.find({

            recipient: req.user.id

        })
        .sort({
            createdAt: -1
        });

        res.json(notifications);

    }
    catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Unable to fetch notifications."
        });

    }

};

const getUnreadCount = async (req, res) => {

    try {

        const count = await Notification.countDocuments({

            recipient: req.user.id,

            isRead: false

        });

        res.json({

            unread: count

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Unable to fetch unread count."
        });

    }

};

const markAsRead = async (req, res) => {

    try {

        const notification = await Notification.findOne({

            _id: req.params.notificationId,

            recipient: req.user.id

        });

        if (!notification) {

            return res.status(404).json({

                error: "Notification not found."

            });

        }

        notification.isRead = true;

        await notification.save();

        res.json({

            success: true,

            message: "Notification marked as read."

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Unable to update notification."
        });

    }

};

const markAllAsRead = async (req, res) => {

    try {

        await Notification.updateMany(

            {

                recipient: req.user.id,

                isRead: false

            },

            {

                isRead: true

            }

        );

        res.json({

            success: true,

            message: "All notifications marked as read."

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            error: "Unable to update notifications."

        });

    }

};

const deleteNotification = async (req, res) => {

    try {

        const notification = await Notification.findOne({

            _id: req.params.notificationId,

            recipient: req.user.id

        });

        if (!notification) {

            return res.status(404).json({

                error: "Notification not found."

            });

        }

        await notification.deleteOne();

        res.json({

            success: true,

            message: "Notification deleted."

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            error: "Unable to delete notification."

        });

    }

};

module.exports = {

    getMyNotifications,

    getUnreadCount,

    markAsRead,

    markAllAsRead,

    deleteNotification

};