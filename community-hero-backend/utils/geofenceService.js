const mongoose = require('mongoose');
const Society = require('../models/Society');

const EARTH_RADIUS_METERS = 6371000;

function parseLatitude(value) {
  const latitude = Number(value);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return null;
  }
  return latitude;
}

function parseLongitude(value) {
  const longitude = Number(value);
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return null;
  }
  return longitude;
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return EARTH_RADIUS_METERS * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function isPointOnSegment(pointLng, pointLat, start, end) {
  const [startLng, startLat] = start;
  const [endLng, endLat] = end;
  const cross = (pointLat - startLat) * (endLng - startLng) - (pointLng - startLng) * (endLat - startLat);
  if (Math.abs(cross) > 1e-10) return false;

  const dot = (pointLng - startLng) * (endLng - startLng) + (pointLat - startLat) * (endLat - startLat);
  if (dot < 0) return false;

  const squaredLength = (endLng - startLng) ** 2 + (endLat - startLat) ** 2;
  return dot <= squaredLength;
}

function isPointInRing(longitude, latitude, ring) {
  if (!Array.isArray(ring) || ring.length < 4) return false;

  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];

    if (isPointOnSegment(longitude, latitude, previousPoint, currentPoint)) {
      return true;
    }

    const [currentLng, currentLat] = currentPoint;
    const [previousLng, previousLat] = previousPoint;
    const intersects =
      currentLat > latitude !== previousLat > latitude &&
      longitude < ((previousLng - currentLng) * (latitude - currentLat)) / (previousLat - currentLat) + currentLng;

    if (intersects) inside = !inside;
  }

  return inside;
}

function isPointInPolygon(longitude, latitude, polygonCoordinates) {
  const [outerRing, ...holes] = polygonCoordinates || [];
  if (!isPointInRing(longitude, latitude, outerRing)) return false;
  return !holes.some((hole) => isPointInRing(longitude, latitude, hole));
}

async function verifyPointInsideSociety({ societyId, latitude, longitude }) {
  if (!mongoose.Types.ObjectId.isValid(String(societyId || ''))) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid society ID.'
    };
  }

  const parsedLat = parseLatitude(latitude);
  const parsedLng = parseLongitude(longitude);

  if (parsedLat === null || parsedLng === null) {
    return {
      ok: false,
      status: 400,
      error: 'Valid GPS latitude and longitude are required.'
    };
  }

  const society = await Society.findById(societyId);
  if (!society) {
    return {
      ok: false,
      status: 404,
      error: 'Society not found.'
    };
  }

  const [centerLng, centerLat] = society.location?.coordinates || [];
  const distanceMeters = getDistanceMeters(
    parsedLat,
    parsedLng,
    Number(centerLat),
    Number(centerLng)
  );
  const hasPolygon =
    society.geofenceMode === 'polygon' &&
    Array.isArray(society.boundary?.coordinates?.[0]) &&
    society.boundary.coordinates[0].length >= 4;
  const insidePolygon = hasPolygon
    ? isPointInPolygon(parsedLng, parsedLat, society.boundary.coordinates)
    : false;
  const isInside = hasPolygon ? insidePolygon : distanceMeters <= society.radiusInMeters;

  return {
    ok: isInside,
    status: isInside ? 200 : 403,
    error: isInside
      ? ''
      : 'Access Denied: GPS location is outside the community geofence.',
    society,
    parsedLat,
    parsedLng,
    distanceMeters: Math.round(distanceMeters),
    radiusInMeters: society.radiusInMeters,
    geofenceMode: hasPolygon ? 'polygon' : 'radius'
  };
}

module.exports = {
  parseLatitude,
  parseLongitude,
  getDistanceMeters,
  isPointInPolygon,
  verifyPointInsideSociety
};
