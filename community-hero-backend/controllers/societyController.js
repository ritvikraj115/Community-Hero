const Society = require('../models/Society');
const User = require('../models/User');
const {
  parseLatitude,
  parseLongitude,
  verifyPointInsideSociety
} = require('../utils/geofenceService');

const normalizeBoundaryCoordinates = (boundaryCoordinates) => {
  if (!Array.isArray(boundaryCoordinates) || boundaryCoordinates.length < 3) {
    return null;
  }

  const ring = boundaryCoordinates
    .map((point) => {
      const longitude = parseLongitude(point?.longitude ?? point?.lng ?? point?.[0]);
      const latitude = parseLatitude(point?.latitude ?? point?.lat ?? point?.[1]);
      if (longitude === null || latitude === null) return null;
      return [longitude, latitude];
    })
    .filter(Boolean);

  if (ring.length < 3) return null;

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([...first]);
  }

  return ring.length >= 4 ? [ring] : null;
};

const createSociety = async (req, res) => {
  try {
    const { name, longitude, latitude, radiusInMeters, communityDetails, boundaryCoordinates } = req.body;
    const adminId = req.user.id;

    if (!name || longitude === undefined || latitude === undefined) {
      return res.status(400).json({
        error: 'Name, longitude, and latitude are required to set the geofence.'
      });
    }

    const existingSociety = await Society.findOne({ admin: adminId });
    if (existingSociety) {
      return res.status(400).json({
        error: 'Community already exists for this admin.'
      });
    }

    const parsedLng = parseLongitude(longitude);
    const parsedLat = parseLatitude(latitude);

    if (parsedLng === null || parsedLat === null) {
      return res.status(400).json({
        error: 'Valid longitude and latitude are required to set the geofence.'
      });
    }

    const normalizedBoundary = normalizeBoundaryCoordinates(boundaryCoordinates);
    const geofenceMode = normalizedBoundary ? 'polygon' : 'radius';

    const society = await Society.create({
      name,
      admin: adminId,
      location: {
        type: 'Point',
        coordinates: [parsedLng, parsedLat]
      },
      radiusInMeters: Number(radiusInMeters) || 200,
      geofenceMode,
      boundary: normalizedBoundary
        ? {
          type: 'Polygon',
          coordinates: normalizedBoundary
        }
        : undefined,
      communityDetails: communityDetails || {},
      maintenanceSchedule: []
    });

    await User.findByIdAndUpdate(adminId, {
      societyId: society._id,
      pendingSocietyId: null,
      joinStatus: 'approved'
    });

    return res.status(201).json(society);
  } catch (error) {
    console.error('Create society error:', error);
    return res.status(500).json({ error: 'Failed to initialize the community.' });
  }
};

const requestJoinSociety = async (req, res) => {
  try {
    const { targetSocietyId, latitude, longitude } = req.body;
    const userId = req.user.id;

    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Admins cannot join as residents.' });
    }

    if (!targetSocietyId) {
      return res.status(400).json({ error: 'Target society ID is required.' });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'GPS coordinates are required to request access.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const societyCheck = await verifyPointInsideSociety({
      societyId: targetSocietyId,
      latitude,
      longitude
    });

    if (!societyCheck.ok) {
      return res.status(societyCheck.status).json({
        error: societyCheck.status === 403
          ? 'Access Denied: You must be physically located within the society to request access.'
          : societyCheck.error,
        distanceMeters: societyCheck.distanceMeters,
        radiusInMeters: societyCheck.radiusInMeters
      });
    }

    await User.findByIdAndUpdate(userId, {
      societyId: null,
      pendingSocietyId: targetSocietyId,
      joinStatus: 'pending',
      lastKnownLocation: {
        latitude: societyCheck.parsedLat,
        longitude: societyCheck.parsedLng,
        verifiedAt: new Date()
      }
    });

    return res.status(200).json({
      message: 'Join request sent to Admin successfully!',
      locationVerified: true
    });
  } catch (error) {
    console.error('Join request error:', error);
    return res.status(500).json({ error: 'Failed to process join request.' });
  }
};

const verifySocietyLocation = async (req, res) => {
  try {
    const { targetSocietyId, latitude, longitude } = req.body;

    if (!targetSocietyId) {
      return res.status(400).json({ error: 'Target society ID is required before verifying location.' });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'GPS coordinates are required to verify location.' });
    }

    const societyCheck = await verifyPointInsideSociety({
      societyId: targetSocietyId,
      latitude,
      longitude
    });

    if (!societyCheck.ok) {
      return res.status(societyCheck.status).json({
        error: societyCheck.status === 403
          ? 'Access Denied: Current location is outside this society geofence.'
          : societyCheck.error,
        distanceMeters: societyCheck.distanceMeters,
        radiusInMeters: societyCheck.radiusInMeters
      });
    }

    return res.json({
      locationVerified: true,
      society: {
        _id: societyCheck.society._id,
        name: societyCheck.society.name,
        radiusInMeters: societyCheck.society.radiusInMeters
      },
      distanceMeters: societyCheck.distanceMeters,
      radiusInMeters: societyCheck.radiusInMeters
    });
  } catch (error) {
    console.error('Verify society location error:', error);
    return res.status(500).json({ error: 'Failed to verify society location.' });
  }
};

const approveResident = async (req, res) => {
  try {
    const { residentUserId } = req.body;
    const adminSocietyId = req.user.societyId;

    if (!adminSocietyId) {
      return res.status(400).json({ error: 'Admin does not have a community yet.' });
    }

    const resident = await User.findById(residentUserId);
    if (!resident || !resident.pendingSocietyId) {
      return res.status(400).json({ error: 'Invalid resident request.' });
    }

    if (resident.pendingSocietyId.toString() !== adminSocietyId.toString()) {
      return res.status(400).json({ error: 'This resident requested a different society.' });
    }

    resident.societyId = adminSocietyId;
    resident.pendingSocietyId = null;
    resident.joinStatus = 'approved';
    await resident.save();

    return res.status(200).json({
      message: 'Resident approved and granted access to the community dashboard.'
    });
  } catch (error) {
    console.error('Approve resident error:', error);
    return res.status(500).json({ error: 'Failed to approve resident.' });
  }
};

const getPendingResidents = async (req, res) => {
  try {
    const residents = await User.find({
      pendingSocietyId: req.user.societyId,
      joinStatus: 'pending'
    }).select('-password');

    return res.json(residents);
  } catch (error) {
    console.error('Pending residents error:', error);
    return res.status(500).json({ error: 'Failed to fetch pending residents.' });
  }
};

const getCommunityMembers = async (req, res) => {
  try {
    if (!req.user.societyId) {
      return res.status(400).json({ error: 'User is not attached to a community yet.' });
    }

    const members = await User.find({
      societyId: req.user.societyId,
      joinStatus: 'approved'
    })
      .select('name email role societyId joinStatus gamificationPoints lastKnownLocation createdAt')
      .sort({ createdAt: 1 });

    return res.json(members);
  } catch (error) {
    console.error('Members fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch community members.' });
  }
};

module.exports = {
  createSociety,
  verifySocietyLocation,
  requestJoinSociety,
  approveResident,
  getPendingResidents,
  getCommunityMembers
};
