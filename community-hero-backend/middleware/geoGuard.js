const {
  verifyPointInsideSociety
} = require('../utils/geofenceService');

const verifyLocation = async (req, res, next) => {
  try {
    const bodyLatitude = req.body.latitude;
    const bodyLongitude = req.body.longitude;
    const fallbackLocation = req.user?.lastKnownLocation || {};
    const latitude = bodyLatitude !== undefined ? bodyLatitude : fallbackLocation.latitude;
    const longitude = bodyLongitude !== undefined ? bodyLongitude : fallbackLocation.longitude;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing GPS coordinates in request.' });
    }

    const userSocietyId = req.user.societyId;
    if (!userSocietyId) {
      return res.status(400).json({ error: 'User is not attached to a society yet.' });
    }

    const societyCheck = await verifyPointInsideSociety({
      societyId: userSocietyId,
      latitude,
      longitude
    });

    if (!societyCheck.ok) {
      return res.status(societyCheck.status).json({
        error: societyCheck.status === 403
          ? 'Access Denied: You are outside the community geofence.'
          : societyCheck.error,
        distanceMeters: societyCheck.distanceMeters,
        radiusInMeters: societyCheck.radiusInMeters
      });
    }

    req.verifiedLocation = {
      latitude: societyCheck.parsedLat,
      longitude: societyCheck.parsedLng,
      distanceMeters: societyCheck.distanceMeters,
      radiusInMeters: societyCheck.radiusInMeters
    };

    return next();
  } catch (error) {
    console.error('Geofence error:', error);
    return res.status(500).json({ error: 'Geofencing verification failed due to a server error.' });
  }
};

module.exports = { verifyLocation };
