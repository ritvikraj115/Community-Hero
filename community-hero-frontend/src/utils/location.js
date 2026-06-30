const DEFAULT_OPTIONS = {
  desiredAccuracyMeters: 35,
  maxAcceptableAccuracyMeters: 220,
  minSamples: 2,
  settleMs: 9500,
  timeoutMs: 24000
};

const normalizePosition = (position) => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: Number(position.coords.accuracy),
  timestamp: position.timestamp || Date.now()
});

export const formatAccuracy = (accuracy) => {
  const parsed = Number(accuracy);
  return Number.isFinite(parsed) ? ` +/- ${Math.round(parsed)}m` : '';
};

const getGeolocationPermissionState = async () => {
  if (!navigator.permissions?.query) return 'unknown';

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state || 'unknown';
  } catch {
    return 'unknown';
  }
};

export const getAccurateLocation = (options = {}) => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Geolocation is not supported by this browser.'));
    return;
  }

  const settings = {
    ...DEFAULT_OPTIONS,
    ...options
  };

  let best = null;
  let samples = 0;
  let settled = false;
  let watchId = null;
  let settleTimer = null;
  let timeoutTimer = null;
  let permissionTimer = null;
  let lastError = null;

  const cleanup = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (settleTimer) clearTimeout(settleTimer);
    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (permissionTimer) clearTimeout(permissionTimer);
  };

  const finish = (callback, value) => {
    if (settled) return;
    settled = true;
    cleanup();
    callback(value);
  };

  const acceptBestOrReject = () => {
    if (!best) {
      finish(reject, new Error('Unable to acquire GPS location. Please enable location permissions and retry.'));
      return;
    }

    if (Number.isFinite(best.accuracy) && best.accuracy > settings.maxAcceptableAccuracyMeters) {
      finish(
        reject,
        new Error(`GPS accuracy is still low${formatAccuracy(best.accuracy)}. Move near a window or wait a moment, then try again.`)
      );
      return;
    }

    finish(resolve, best);
  };

  const handlePosition = (position) => {
    const current = normalizePosition(position);
    samples += 1;
    lastError = null;

    if (
      !best ||
      !Number.isFinite(best.accuracy) ||
      (Number.isFinite(current.accuracy) && current.accuracy < best.accuracy)
    ) {
      best = current;
    }

    if (typeof settings.onUpdate === 'function') {
      settings.onUpdate(best, samples);
    }

    if (
      samples >= settings.minSamples &&
      Number.isFinite(best.accuracy) &&
      best.accuracy <= settings.desiredAccuracyMeters
    ) {
      finish(resolve, best);
    }
  };

  const handleError = (error) => {
    lastError = error;
    if (best) return;

    if (error?.code !== 1) {
      return;
    }

    permissionTimer = setTimeout(async () => {
      if (settled || best) return;

      const permissionState = await getGeolocationPermissionState();
      if (permissionState === 'denied' || permissionState === 'unknown') {
        finish(reject, new Error('Please enable location permissions.'));
      }
    }, 700);
  };

  const geoOptions = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: settings.timeoutMs
  };

  navigator.geolocation.getCurrentPosition(
    handlePosition,
    handleError,
    geoOptions
  );

  watchId = navigator.geolocation.watchPosition(
    handlePosition,
    handleError,
    geoOptions
  );

  settleTimer = setTimeout(acceptBestOrReject, settings.settleMs);
  timeoutTimer = setTimeout(async () => {
    if (!best && lastError?.code === 1) {
      const permissionState = await getGeolocationPermissionState();
      if (permissionState === 'denied' || permissionState === 'unknown') {
        finish(reject, new Error('Please enable location permissions.'));
        return;
      }

      acceptBestOrReject();
      return;
    }

    acceptBestOrReject();
  }, settings.timeoutMs + 1000);
});
