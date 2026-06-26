// backend/utils/resolutionAnalytics.js

const Issue = require("../models/Issue");

async function getResolutionAnalytics(societyId) {

    const analytics = await Issue.aggregate([

        {
            $match: {
                societyId
            }
        },

        {
            $facet: {

                statusDistribution: [

                    {
                        $group: {

                            _id: "$status",

                            count: {
                                $sum: 1
                            }

                        }

                    }

                ],

                averageResolutionTime: [

                    {
                        $match: {
                            status: "Resolved"
                        }
                    },

                    {
                        $project: {

                            resolutionHours: {

                                $divide: [

                                    {
                                        $subtract: [
                                            "$updatedAt",
                                            "$createdAt"
                                        ]
                                    },

                                    1000 * 60 * 60

                                ]

                            }

                        }

                    },

                    {
                        $group: {

                            _id: null,

                            averageHours: {

                                $avg: "$resolutionHours"

                            }

                        }

                    }

                ],

                severityDistribution: [

                    {
                        $group: {

                            _id: "$severityScore",

                            total: {
                                $sum: 1
                            }

                        }

                    },

                    {
                        $sort: {
                            _id: 1
                        }
                    }

                ],

                aiConfidenceDistribution: [

                    {
                        $match: {

                            aiConfidenceScore: {
                                $exists: true
                            }

                        }
                    },

                    {
                        $group: {

                            _id: null,

                            averageConfidence: {

                                $avg: "$aiConfidenceScore"

                            },

                            maxConfidence: {

                                $max: "$aiConfidenceScore"

                            },

                            minConfidence: {

                                $min: "$aiConfidenceScore"

                            }

                        }

                    }

                ],

                categoryDistribution: [

                    {
                        $group: {

                            _id: "$category",

                            total: {
                                $sum: 1
                            },

                            averageSeverity: {

                                $avg: "$severityScore"

                            }

                        }

                    },

                    {
                        $sort: {
                            total: -1
                        }
                    }

                ]

            }

        }

    ]);

    return analytics[0];

}

module.exports = {

    getResolutionAnalytics

};