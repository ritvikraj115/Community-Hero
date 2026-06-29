const {
  verifyPointInsideSociety
} = require('../utils/geofenceService');

const buildVerifyLocation = ({ requireFresh = false, skipAdmin = false } = {}) => async (req, res, next) => {
  try {
    if (skipAdmin && req.user?.role === 'admin') {
      req.verifiedLocation = {
        source: 'admin-bypass'
      };
      return next();
    }

    const lastKnownLocation = req.user?.lastKnownLocation || {};
    const requestCoordinates = {
      ...req.query,
      ...req.body
    };
    const latitude = requireFresh ? requestCoordinates.latitude : lastKnownLocation.latitude;
    const longitude = requireFresh ? requestCoordinates.longitude : lastKnownLocation.longitude;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: requireFresh
          ? 'Fresh GPS coordinates are required for this geofenced action.'
          : 'Login with GPS verification before using this community action.'
      });
    }

    const userSocietyId = req.user.societyId;
    if (!userSocietyId || req.user.joinStatus !== 'approved') {
      return res.status(403).json({
        error: 'User must be approved in a society before using this community action.'
      });
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
      radiusInMeters: societyCheck.radiusInMeters,
      source: requireFresh ? 'request' : 'lastKnownLocation'
    };

    return next();
  } catch (error) {
    console.error('Geofence error:', error);
    return res.status(500).json({ error: 'Geofencing verification failed due to a server error.' });
  }
};

const verifyCommunityMemberLocation = buildVerifyLocation();
const verifyLocation = buildVerifyLocation({ skipAdmin: true });
const verifyFreshLocation = buildVerifyLocation({ requireFresh: true });
const verifyResolutionLocation = (req, res, next) => {
  if (req.user?.role === 'admin') {
    return verifyFreshLocation(req, res, next);
  }

  return verifyCommunityMemberLocation(req, res, next);
};

module.exports = {
  verifyLocation,
  verifyFreshLocation,
  verifyResolutionLocation
};
