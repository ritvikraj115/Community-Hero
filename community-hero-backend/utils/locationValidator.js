// backend/utils/locationValidator.js

const Society = require("../models/Society");

/*
==========================================================
Haversine Distance (Meters)
==========================================================
*/

function calculateDistance(lat1, lon1, lat2, lon2) {

    const R = 6371000;

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    return (
        R *
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        )
    );

}

/*
==========================================================
Inside Society Geofence
==========================================================
*/

async function validateResidentLocation(
    societyId,
    latitude,
    longitude
) {

    const society =
        await Society.findById(societyId);

    if (!society) {

        return {

            valid: false,

            reason:
                "Society not found."

        };

    }

    const [societyLng, societyLat] =
        society.location.coordinates;

    const distance =
        calculateDistance(
            latitude,
            longitude,
            societyLat,
            societyLng
        );

    const valid =
        distance <=
        society.radiusInMeters;

    return {

        valid,

        distance:

            Math.round(distance),

        allowedRadius:

            society.radiusInMeters,

        societyCenter: {

            latitude: societyLat,

            longitude: societyLng

        }

    };

}

/*
==========================================================
Join Request Validation
==========================================================
*/

async function validateJoinRequest(
    societyId,
    latitude,
    longitude
) {

    const result =
        await validateResidentLocation(
            societyId,
            latitude,
            longitude
        );

    if (!result.valid) {

        result.message =
            "Resident is outside society boundary.";

    }
    else {

        result.message =
            "Resident is inside society boundary.";

    }

    return result;

}

/*
==========================================================
Issue Creation Validation
==========================================================
*/

async function validateIssueLocation(
    societyId,
    latitude,
    longitude
) {

    return await validateResidentLocation(

        societyId,

        latitude,

        longitude

    );

}

/*
==========================================================
Resolution Validation
==========================================================
*/

async function validateResolutionLocation(
    societyId,
    latitude,
    longitude
) {

    return await validateResidentLocation(

        societyId,

        latitude,

        longitude

    );

}

module.exports = {

    calculateDistance,

    validateResidentLocation,

    validateJoinRequest,

    validateIssueLocation,

    validateResolutionLocation

};