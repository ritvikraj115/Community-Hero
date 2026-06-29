const axios = require("axios");

let keepAliveTimer = null;

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const isEnabled = () => String(process.env.ENABLE_KEEP_ALIVE || "").toLowerCase() === "true";

const getKeepAliveUrl = () => {
  const explicitUrl = String(process.env.KEEP_ALIVE_URL || "").trim();
  if (explicitUrl) return explicitUrl;

  const backendUrl = String(process.env.BACKEND_URL || "").trim();
  if (backendUrl) return `${trimTrailingSlash(backendUrl)}/health`;

  const renderUrl = String(process.env.RENDER_EXTERNAL_URL || "").trim();
  return renderUrl ? `${trimTrailingSlash(renderUrl)}/health` : "";
};

const getIntervalMs = () => {
  const configured = Number(process.env.KEEP_ALIVE_INTERVAL_MS);
  return Number.isFinite(configured) && configured >= 60000 ? configured : 5 * 60 * 1000;
};

const ping = async (url) => {
  try {
    await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": "CommunityHero-KeepAlive/1.0"
      }
    });
  } catch (error) {
    console.warn("Keep-alive ping failed:", error.message);
  }
};

const startKeepAlive = () => {
  if (!isEnabled() || keepAliveTimer) return;

  const url = getKeepAliveUrl();
  if (!url) {
    console.warn("ENABLE_KEEP_ALIVE=true but KEEP_ALIVE_URL or BACKEND_URL is not configured.");
    return;
  }

  const intervalMs = getIntervalMs();
  keepAliveTimer = setInterval(() => {
    ping(url);
  }, intervalMs);

  if (typeof keepAliveTimer.unref === "function") {
    keepAliveTimer.unref();
  }

  console.log(`Keep-alive enabled: pinging ${url} every ${Math.round(intervalMs / 1000)} seconds.`);
};

const stopKeepAlive = () => {
  if (!keepAliveTimer) return;
  clearInterval(keepAliveTimer);
  keepAliveTimer = null;
};

module.exports = {
  startKeepAlive,
  stopKeepAlive
};
