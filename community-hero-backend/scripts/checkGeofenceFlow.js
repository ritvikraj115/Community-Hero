require("dotenv").config();

const axios = require("axios");
const FormData = require("form-data");
const mongoose = require("mongoose");

const Issue = require("../models/Issue");
const Society = require("../models/Society");
const User = require("../models/User");
const { verifyPointInsideSociety } = require("../utils/geofenceService");

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");
const API_BASE_URL = process.env.API_BASE_URL ||
  (process.env.BACKEND_URL ? `${trimTrailingSlash(process.env.BACKEND_URL)}/api` : "");

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL or BACKEND_URL is required.");
}
const DEMO_DOMAIN = "demo.communityhero.local";
const PASSWORD = "Demo@12345";

const offsetPoint = (center, eastMeters, northMeters) => {
  const latitude = center.latitude + northMeters / 111320;
  const longitude = center.longitude + eastMeters / (111320 * Math.cos(center.latitude * Math.PI / 180));
  return { latitude, longitude };
};

const login = async (email, coordinates, role = "resident") => {
  const payload = {
    email,
    password: PASSWORD,
    role
  };

  if (coordinates) {
    payload.latitude = coordinates.latitude;
    payload.longitude = coordinates.longitude;
  }

  return axios.post(`${API_BASE_URL}/auth/login`, payload, {
    validateStatus: () => true
  });
};

const authHeaders = (token, extra = {}) => ({
  ...extra,
  Authorization: `Bearer ${token}`
});

const createTempAdmin = async (stamp, label = "polygon-admin") => {
  const email = `${label}-${stamp}@${DEMO_DOMAIN}`;
  const res = await axios.post(
    `${API_BASE_URL}/auth/register`,
    {
      name: `${label} QA Admin`,
      email,
      password: PASSWORD,
      role: "admin"
    },
    {
      validateStatus: () => true
    }
  );

  return { email, res };
};

const toBoundaryCoordinates = (points) => points.map((point) => ({
  lat: point.latitude,
  lng: point.longitude
}));

const onePixelPng = () => Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const society = await Society.findOne({}).sort({ createdAt: -1 }).lean();
  if (!society) {
    throw new Error("No society found. Run npm run seed:demo first.");
  }

  const [longitude, latitude] = society.location.coordinates;
  const center = { latitude, longitude };
  const inside = offsetPoint(center, Math.min(30, society.radiusInMeters / 3), 20);
  const outside = offsetPoint(center, society.radiusInMeters + 260, 0);

  const checks = [];
  const record = (name, ok, detail) => {
    checks.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
  };

  const insideUtil = await verifyPointInsideSociety({
    societyId: society._id,
    latitude: inside.latitude,
    longitude: inside.longitude
  });
  record("utility accepts inside point", insideUtil.ok, `distance=${insideUtil.distanceMeters}m`);

  const outsideUtil = await verifyPointInsideSociety({
    societyId: society._id,
    latitude: outside.latitude,
    longitude: outside.longitude
  });
  record("utility rejects outside point", !outsideUtil.ok && outsideUtil.status === 403, `distance=${outsideUtil.distanceMeters}m`);

  const polygonStamp = Date.now();
  const polygonAdmins = [];
  const polygonSocietyNames = [];
  try {
    const polygonSquare = [
      offsetPoint(center, -80, -80),
      offsetPoint(center, 80, -80),
      offsetPoint(center, 80, 80),
      offsetPoint(center, -80, 80)
    ];
    const polygonAdmin = await createTempAdmin(polygonStamp);
    polygonAdmins.push(polygonAdmin.email);
    record(
      "temp polygon admin registration",
      polygonAdmin.res.status === 201 && polygonAdmin.res.data?.token,
      `status=${polygonAdmin.res.status}`
    );

    const polygonName = `Polygon QA Society ${polygonStamp}`;
    polygonSocietyNames.push(polygonName);
    const polygonCreate = await axios.post(
      `${API_BASE_URL}/societies`,
      {
        name: polygonName,
        latitude: center.latitude,
        longitude: center.longitude,
        radiusInMeters: 120,
        boundaryCoordinates: toBoundaryCoordinates(polygonSquare)
      },
      {
        headers: authHeaders(polygonAdmin.res.data?.token),
        validateStatus: () => true
      }
    );
    record(
      "admin can create polygon community from drawn border",
      polygonCreate.status === 201 && polygonCreate.data?.geofenceMode === "polygon",
      `status=${polygonCreate.status}, mode=${polygonCreate.data?.geofenceMode || "-"}`
    );

    const polygonSocietyId = polygonCreate.data?._id;
    const polygonInside = await verifyPointInsideSociety({
      societyId: polygonSocietyId,
      latitude: center.latitude,
      longitude: center.longitude
    });
    record("polygon utility accepts center inside border", polygonInside.ok && polygonInside.geofenceMode === "polygon", `status=${polygonInside.status}`);

    const polygonOutside = offsetPoint(center, 220, 0);
    const polygonOutsideCheck = await verifyPointInsideSociety({
      societyId: polygonSocietyId,
      latitude: polygonOutside.latitude,
      longitude: polygonOutside.longitude
    });
    record("polygon utility rejects outside point", !polygonOutsideCheck.ok && polygonOutsideCheck.status === 403, `status=${polygonOutsideCheck.status}`);

    const polygonBorder = offsetPoint(center, 0, 80);
    const polygonBorderCheck = await verifyPointInsideSociety({
      societyId: polygonSocietyId,
      latitude: polygonBorder.latitude,
      longitude: polygonBorder.longitude
    });
    record("polygon utility treats border point as inside", polygonBorderCheck.ok, `status=${polygonBorderCheck.status}`);

    const badPolygonAdmin = await createTempAdmin(polygonStamp, "bad-polygon-admin");
    polygonAdmins.push(badPolygonAdmin.email);
    const badPolygonName = `Bad Polygon QA Society ${polygonStamp}`;
    polygonSocietyNames.push(badPolygonName);
    const awayCenter = offsetPoint(center, 260, 260);
    const badPolygonCreate = await axios.post(
      `${API_BASE_URL}/societies`,
      {
        name: badPolygonName,
        latitude: awayCenter.latitude,
        longitude: awayCenter.longitude,
        radiusInMeters: 120,
        boundaryCoordinates: toBoundaryCoordinates(polygonSquare)
      },
      {
        headers: authHeaders(badPolygonAdmin.res.data?.token),
        validateStatus: () => true
      }
    );
    record("admin setup rejects center outside drawn border", badPolygonCreate.status === 400, `status=${badPolygonCreate.status}`);
  } finally {
    if (polygonSocietyNames.length) {
      await Society.deleteMany({ name: { $in: polygonSocietyNames } });
    }
    if (polygonAdmins.length) {
      await User.deleteMany({ email: { $in: polygonAdmins } });
    }
  }

  const unauthenticatedVerify = await axios.post(
    `${API_BASE_URL}/societies/verify-location`,
    {
      targetSocietyId: society._id,
      latitude: inside.latitude,
      longitude: inside.longitude
    },
    {
      validateStatus: () => true
    }
  );
  record("location verification requires authenticated user token", unauthenticatedVerify.status === 401, `status=${unauthenticatedVerify.status}`);

  const identifiedWithoutGps = await login(`resident1@${DEMO_DOMAIN}`);
  record(
    "approved resident is identified before GPS is requested",
    identifiedWithoutGps.status === 428 && identifiedWithoutGps.data?.code === "GPS_REQUIRED",
    `status=${identifiedWithoutGps.status}, code=${identifiedWithoutGps.data?.code || "-"}`
  );

  const insideLogin = await login(`resident1@${DEMO_DOMAIN}`, inside);
  record(
    "email/password login binds GPS to approved resident society",
    insideLogin.status === 200 && insideLogin.data?.token && insideLogin.data?.email === `resident1@${DEMO_DOMAIN}`,
    `status=${insideLogin.status}, email=${insideLogin.data?.email || "-"}`
  );

  const outsideLogin = await login(`resident1@${DEMO_DOMAIN}`, outside);
  record("approved resident login outside radius rejected", outsideLogin.status === 403, `status=${outsideLogin.status}`);

  const adminWithoutGps = await login(`admin@${DEMO_DOMAIN}`, null, "admin");
  record(
    "approved admin can log in without GPS",
    adminWithoutGps.status === 200 && adminWithoutGps.data?.token && adminWithoutGps.data?.email === `admin@${DEMO_DOMAIN}`,
    `status=${adminWithoutGps.status}, email=${adminWithoutGps.data?.email || "-"}`
  );

  const joinLogin = await login(`joinflow@${DEMO_DOMAIN}`);
  record("unjoined resident can log in before society selection", joinLogin.status === 200 && joinLogin.data?.token, `status=${joinLogin.status}`);

  const joinToken = joinLogin.data?.token;
  const insideJoinVerify = await axios.post(
    `${API_BASE_URL}/societies/verify-location`,
    {
      targetSocietyId: society._id,
      latitude: inside.latitude,
      longitude: inside.longitude
    },
    {
      headers: authHeaders(joinToken),
      validateStatus: () => true
    }
  );
  record("join pre-check accepts inside point", insideJoinVerify.status === 200, `status=${insideJoinVerify.status}`);

  const outsideJoinVerify = await axios.post(
    `${API_BASE_URL}/societies/verify-location`,
    {
      targetSocietyId: society._id,
      latitude: outside.latitude,
      longitude: outside.longitude
    },
    {
      headers: authHeaders(joinToken),
      validateStatus: () => true
    }
  );
  record("join pre-check rejects outside point", outsideJoinVerify.status === 403, `status=${outsideJoinVerify.status}`);

  await User.findOneAndUpdate(
    { email: `pending@${DEMO_DOMAIN}` },
    {
      pendingSocietyId: society._id,
      joinStatus: "pending",
      societyId: null,
      lastKnownLocation: {
        latitude: outside.latitude,
        longitude: outside.longitude,
        verifiedAt: new Date()
      }
    }
  );

  const outsidePendingApproval = await axios.post(
    `${API_BASE_URL}/societies/approve-resident`,
    {
      residentUserId: (await User.findOne({ email: `pending@${DEMO_DOMAIN}` }).select("_id").lean())._id
    },
    {
      headers: authHeaders(adminWithoutGps.data.token),
      validateStatus: () => true
    }
  );
  record(
    "admin approval rejects pending resident whose verified location is outside boundary",
    outsidePendingApproval.status === 403,
    `status=${outsidePendingApproval.status}`
  );

  await User.findOneAndUpdate(
    { email: `pending@${DEMO_DOMAIN}` },
    {
      pendingSocietyId: society._id,
      joinStatus: "pending",
      societyId: null,
      lastKnownLocation: {
        latitude: inside.latitude,
        longitude: inside.longitude,
        verifiedAt: new Date()
      }
    }
  );

  const form = new FormData();
  form.append("title", "Outside radius QA rejection");
  form.append("description", "This request intentionally uses a point outside the community radius.");
  form.append("latitude", String(outside.latitude));
  form.append("longitude", String(outside.longitude));
  form.append("issueImage", onePixelPng(), {
    filename: "outside-radius.png",
    contentType: "image/png"
  });

  const outsideIssue = await axios.post(`${API_BASE_URL}/issues`, form, {
    headers: authHeaders(insideLogin.data.token, form.getHeaders()),
    validateStatus: () => true
  });
  record("issue creation outside radius rejected", outsideIssue.status === 403, `status=${outsideIssue.status}`);

  const resident2Login = await login(`resident2@${DEMO_DOMAIN}`, inside);
  const openIssue = await Issue.findOne({
    societyId: society._id,
    status: "Open"
  }).lean();

  const adminResolveWithoutGpsForm = new FormData();
  adminResolveWithoutGpsForm.append("resolutionSummary", "Admin onsite GPS is intentionally missing for this QA check.");
  adminResolveWithoutGpsForm.append("resolvedImage", onePixelPng(), {
    filename: "admin-no-gps.png",
    contentType: "image/png"
  });

  const adminResolveWithoutGps = await axios.post(
    `${API_BASE_URL}/issues/${openIssue._id}/resolve`,
    adminResolveWithoutGpsForm,
    {
      headers: authHeaders(adminWithoutGps.data.token, adminResolveWithoutGpsForm.getHeaders()),
      validateStatus: () => true
    }
  );
  record("admin fix upload requires fresh onsite GPS", adminResolveWithoutGps.status === 400, `status=${adminResolveWithoutGps.status}`);

  const adminResolveOutsideForm = new FormData();
  adminResolveOutsideForm.append("resolutionSummary", "Admin onsite GPS is intentionally outside for this QA check.");
  adminResolveOutsideForm.append("latitude", String(outside.latitude));
  adminResolveOutsideForm.append("longitude", String(outside.longitude));
  adminResolveOutsideForm.append("resolvedImage", onePixelPng(), {
    filename: "admin-outside-gps.png",
    contentType: "image/png"
  });

  const adminResolveOutside = await axios.post(
    `${API_BASE_URL}/issues/${openIssue._id}/resolve`,
    adminResolveOutsideForm,
    {
      headers: authHeaders(adminWithoutGps.data.token, adminResolveOutsideForm.getHeaders()),
      validateStatus: () => true
    }
  );
  record("admin fix upload outside radius rejected", adminResolveOutside.status === 403, `status=${adminResolveOutside.status}`);

  await User.findOneAndUpdate(
    { email: `resident2@${DEMO_DOMAIN}` },
    {
      lastKnownLocation: {
        latitude: outside.latitude,
        longitude: outside.longitude,
        verifiedAt: new Date()
      }
    }
  );

  const actionWithOutsideLastKnown = await axios.post(
    `${API_BASE_URL}/issues/${openIssue._id}/comments`,
    {
      text: `Geofence QA blocked comment with outside lastKnownLocation at ${new Date().toISOString()}`
    },
    {
      headers: authHeaders(resident2Login.data.token),
      validateStatus: () => true
    }
  );
  record("routine issue action rejects authenticated user's outside lastKnownLocation", actionWithOutsideLastKnown.status === 403, `status=${actionWithOutsideLastKnown.status}`);

  await User.findOneAndUpdate(
    { email: `resident2@${DEMO_DOMAIN}` },
    {
      lastKnownLocation: {
        latitude: inside.latitude,
        longitude: inside.longitude,
        verifiedAt: new Date()
      }
    }
  );

  const actionWithoutFreshGps = await axios.post(
    `${API_BASE_URL}/issues/${openIssue._id}/comments`,
    {
      text: `Geofence QA comment without fresh GPS at ${new Date().toISOString()}`
    },
    {
      headers: authHeaders(resident2Login.data.token),
      validateStatus: () => true
    }
  );
  record("routine issue action works from authenticated user's inside lastKnownLocation", actionWithoutFreshGps.status === 200, `status=${actionWithoutFreshGps.status}`);

  await mongoose.connection.close();

  const failed = checks.filter((check) => !check.ok);
  if (failed.length) {
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error("Geofence QA failed:", error.message);
  await mongoose.connection.close();
  process.exit(1);
});
