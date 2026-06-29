require("dotenv").config();

const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const timeoutMs = Number(process.env.GPS_SEED_TIMEOUT_MS || 240000);

const page = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Community Hero GPS Seed</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f1f5f9; color: #0f172a; }
      main { width: min(520px, calc(100vw - 32px)); background: #fff; border: 1px solid #dbe3ef; border-radius: 8px; padding: 28px; box-shadow: 0 18px 48px rgba(15, 23, 42, 0.10); }
      h1 { margin: 0 0 8px; font-size: 24px; }
      p { color: #475569; line-height: 1.55; }
      button { width: 100%; border: 0; border-radius: 8px; background: #0f172a; color: #fff; padding: 14px 16px; font-size: 16px; font-weight: 700; cursor: pointer; }
      button:disabled { opacity: 0.65; cursor: progress; }
      pre { white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; color: #334155; }
    </style>
  </head>
  <body>
    <main>
      <h1>Seed Demo At This Location</h1>
      <p>This asks the browser for your current GPS position and sends it only to localhost so the backend seed can use this exact community center.</p>
      <button id="capture">Use Current Location And Seed</button>
      <pre id="status">Waiting for permission...</pre>
    </main>
    <script>
      const button = document.getElementById("capture");
      const statusBox = document.getElementById("status");

      const formatAccuracy = (accuracy) => Number.isFinite(Number(accuracy))
        ? " +/- " + Math.round(Number(accuracy)) + "m"
        : "";

      const captureSettledLocation = () => new Promise((resolve, reject) => {
        let best = null;
        let samples = 0;
        let settled = false;
        let watchId = null;
        let settleTimer = null;
        let timeoutTimer = null;

        const cleanup = () => {
          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
          }
          if (settleTimer) clearTimeout(settleTimer);
          if (timeoutTimer) clearTimeout(timeoutTimer);
        };

        const finish = (callback, value) => {
          if (settled) return;
          settled = true;
          cleanup();
          callback(value);
        };

        const acceptBestOrReject = () => {
          if (!best) {
            finish(reject, new Error("Unable to acquire GPS location."));
            return;
          }

          if (Number.isFinite(best.accuracy) && best.accuracy > 150) {
            finish(reject, new Error("GPS accuracy is still low" + formatAccuracy(best.accuracy) + ". Move near a window and retry."));
            return;
          }

          finish(resolve, best);
        };

        watchId = navigator.geolocation.watchPosition((position) => {
          const current = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          samples += 1;

          if (!best || !Number.isFinite(best.accuracy) || (Number.isFinite(current.accuracy) && current.accuracy < best.accuracy)) {
            best = current;
          }

          statusBox.textContent = "Improving GPS accuracy" + formatAccuracy(best.accuracy) + "...";

          if (samples >= 2 && Number.isFinite(best.accuracy) && best.accuracy <= 35) {
            finish(resolve, best);
          }
        }, (error) => {
          if (!best) finish(reject, error);
        }, {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        });

        settleTimer = setTimeout(acceptBestOrReject, 8000);
        timeoutTimer = setTimeout(acceptBestOrReject, 21000);
      });

      button.addEventListener("click", async () => {
        button.disabled = true;
        statusBox.textContent = "Requesting high-accuracy GPS from the browser...";

        if (!navigator.geolocation) {
          statusBox.textContent = "This browser does not support geolocation.";
          button.disabled = false;
          return;
        }

        try {
          const position = await captureSettledLocation();
          const payload = {
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy
          };
          statusBox.textContent = "Captured: " + JSON.stringify(payload, null, 2) + "\\nRunning seed...";

          const response = await fetch("/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          const data = await response.json();
          statusBox.textContent = data.message || "Seed request sent.";
        } catch (error) {
          statusBox.textContent = "Location failed: " + error.message;
          button.disabled = false;
        }
      });
    </script>
  </body>
</html>`;

const parseBody = (request) => new Promise((resolve, reject) => {
  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
    if (body.length > 8192) {
      request.destroy();
      reject(new Error("Request body too large."));
    }
  });
  request.on("end", () => {
    try {
      resolve(JSON.parse(body || "{}"));
    } catch (error) {
      reject(error);
    }
  });
});

const runSeed = ({ latitude, longitude, accuracy }) => {
  console.log(`Captured browser GPS: ${latitude}, ${longitude} (accuracy ${accuracy ?? "unknown"}m)`);

  const child = spawn(process.execPath, [path.join(__dirname, "seedDemoData.js")], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      DEMO_CENTER_LAT: String(latitude),
      DEMO_CENTER_LNG: String(longitude)
    },
    stdio: "inherit"
  });

  child.on("exit", (code) => {
    process.exit(code || 0);
  });
};

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(page);
    return;
  }

  if (request.method === "POST" && request.url === "/location") {
    try {
      const body = await parseBody(request);
      const latitude = Number(body.latitude);
      const longitude = Number(body.longitude);
      const accuracy = Number(body.accuracy);

      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: "Invalid coordinates." }));
        return;
      }

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Coordinates received. You can close this tab; seeding is running in the terminal." }));

      server.close(() => runSeed({ latitude, longitude, accuracy: Number.isFinite(accuracy) ? accuracy : undefined }));
    } catch (error) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: error.message || "Failed to parse location." }));
    }
    return;
  }

  response.writeHead(404);
  response.end();
});

const openBrowser = (url) => {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  const opener = process.platform === "darwin" ? "open" : "xdg-open";
  spawn(opener, [url], { detached: true, stdio: "ignore" }).unref();
};

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}`;
  console.log(`Opening browser GPS capture: ${url}`);
  console.log("Click the button in the browser and allow location permission.");
  openBrowser(url);
});

setTimeout(() => {
  console.error("Timed out waiting for browser GPS permission.");
  server.close(() => process.exit(2));
}, timeoutMs).unref();
