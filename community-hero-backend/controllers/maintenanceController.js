// backend/controllers/maintenanceController.js

const MaintenanceTask = require("../models/MaintenanceTask");

const {
    generateOverdueMaintenanceIssues,
    markMaintenanceCompleted
} = require("../utils/maintenanceScheduler");

const getMaintenanceTasks = async (req, res) => {

    try {

        const tasks = await MaintenanceTask.find({

            societyId: req.user.societyId

        }).sort({

            deadline: 1

        });

        res.json({

            success: true,

            tasks

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

};

const createMaintenanceTask = async (req, res) => {

    try {

        const task = await MaintenanceTask.create({

            societyId: req.user.societyId,

            createdBy: req.user.id,

            title: req.body.title,

            description: req.body.description,

            category: req.body.category,

            priority: req.body.priority,

            scheduledDate: req.body.scheduledDate,

            deadline: req.body.deadline,

            assignedTo: req.body.assignedTo || null

        });

        res.status(201).json({

            success: true,

            task

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

};

const completeMaintenanceTask = async (req, res) => {

    try {

        const success = await markMaintenanceCompleted(

            req.user.societyId,

            req.params.taskId

        );

        if (!success) {

            return res.status(404).json({

                success: false,

                error: "Task not found."

            });

        }

        res.json({

            success: true,

            message: "Maintenance marked completed."

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

};

const runMaintenanceScheduler = async (req, res) => {

    try {

        const generated =
            await generateOverdueMaintenanceIssues();

        res.json({

            success: true,

            generated

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

};

module.exports = {

    getMaintenanceTasks,

    createMaintenanceTask,

    completeMaintenanceTask,

    runMaintenanceScheduler

};