# Community Hero

Community Hero is an AI-powered civic issue management platform for gated communities, residential societies, campuses, and smart neighborhoods. It combines Google Gemini, Google embeddings, Google Maps geofencing, MongoDB, role-based workflows, and community verification so residents can report, validate, resolve, and learn from local problems.

## Submission Links

- Live application: https://chero-r115-20260630.web.app
- Alternate Firebase URL: https://chero-r115-20260630.firebaseapp.com
- GitHub repository: https://github.com/ritvikraj115/Community-Hero
- Project description Google Doc: https://docs.google.com/document/d/1dN9K4oIP3FAW-_EVGlaOBGAsq31u2Tu_1LMz4uRc-3Y/edit

## What It Does

- Admins create one geofenced community.
- Residents register, enter a Society ID, and request to join only after GPS verification.
- Admins approve verified residents.
- Approved residents report issues with an image, description, and fresh GPS.
- Google Gemini analyzes issue images and text.
- Google embeddings detect semantic duplicates and retrieve similar historical fixes.
- Residents collaboratively approve issues and verify resolutions.
- Solvers can claim issues, request help, describe fixes, and upload proof.
- Resolved issues become reusable community knowledge.
- Dashboards show issues, analytics, notifications, leaderboard, history, maintenance, weather, and the community map.

## Problem Statement Fit

This project targets **Problem Statement 2: Community Hero - Hyperlocal Problem Solver**.

It addresses the required flow from the hackathon brief:

- Identify and report local civic issues with images and GPS.
- Categorize issues with Google Gemini.
- Validate reports through community voting and geofencing.
- Track issues from report to resolution.
- Resolve issues collaboratively with helpers, fix notes, proof images, and verification.
- Use dashboards, maps, history, duplicate detection, and gamification to improve transparency and participation.

## Geofence Contract

Community boundaries are the source of truth for all location checks.

During community creation, the admin chooses one of two modes:

- Radius mode: the admin captures the community center and enters a radius in meters.
- Polygon mode: the admin draws the exact boundary on Google Maps. The backend stores it as a GeoJSON polygon and also keeps a fallback radius.

The community map renders the saved boundary:

- Polygon communities show the drawn polygon border.
- Radius communities show the radius circle.

The backend location verifier is `community-hero-backend/utils/geofenceService.js`.

It works like this:

- If the society has a valid polygon boundary, the GPS point must be inside that polygon.
- Otherwise, the GPS point must be within `radiusInMeters` from the society center.
- Points on a polygon border are treated as inside.
- Invalid or missing coordinates are rejected.

## Where Location Is Enforced

Registration is not geofenced because a new resident has not selected a society yet.

Every geofence check is identity-bound:

- Login uses `email` and `password` first, then checks that user's saved `societyId`.
- The login screen must not show "location verified" before email/password identify the account.
- Join verification uses the JWT from the registered/logged-in resident plus the entered `targetSocietyId`.
- Issue creation and issue actions use the JWT user identity and that user's approved `societyId`.
- A coordinate-only request without an authenticated user token is rejected.

Every community-bound action uses the saved society boundary:

- Join pre-check: requires `targetSocietyId`, latitude, and longitude.
- Join request: requires the same `targetSocietyId`, latitude, and longitude.
- Login: approved users with a society must provide fresh GPS inside their assigned society.
- Admin community setup: the admin's current GPS becomes the community center, is saved as the admin's verified location, and must be inside a drawn polygon border.
- Admin resident approval: the admin must be verified inside the society, and the pending resident's stored join verification is rechecked against that same society boundary.
- Issue creation: requires fresh GPS inside the assigned society.
- Duplicate pre-check and nearby issue discovery: require fresh GPS inside the assigned society.
- Issue actions: claim, approval vote, comment, request help, submit fix, and resolution vote use the user's last backend-verified login or join location, then re-check that location against the assigned society.

This keeps routine issue actions smooth while still ensuring the saved verified location belongs inside the society boundary. Creating a new issue remains fresh-GPS because the report itself needs an exact location.

## Fairness Rules

- The issue creator cannot vote to approve their own issue.
- A solver cannot vote to verify their own resolution.
- More than one resident can join an issue as a helper.
- Admins can upload a fix directly when they are inside the community geofence.
- Solvers and admins can request more community help with a reason.
- Resolved issues are retained in history and knowledge, but they do not block future similar reports as active duplicates.

## Tech Stack

Frontend:

- React
- React Router
- Axios
- Google Maps JavaScript API
- `@react-google-maps/api`

Backend:

- Node.js
- Express
- MongoDB
- Mongoose
- JWT authentication
- Multer uploads

AI and external services:

- Google Gemini image and text reasoning
- Google embedding model
- OpenWeather API

## AI Image Safety Gates

Issue creation and resolution uploads use Gemini image checks, but the backend only blocks when Gemini is confident enough to make that decision.

- New issue images are rejected only when Gemini is highly confident the upload is spam, unrelated, or does not show a visible civic issue.
- Resolution images are rejected only when Gemini is highly confident the fix proof is spam/irrelevant, the same issue is still visible, or the fix score is below the configured threshold.
- Ambiguous or low-confidence cases are not auto-rejected; they continue to community voting.
- Common browser uploads such as JPG/JPEG and PNG are supported.

Tunable backend env vars:

```env
ISSUE_IMAGE_MIN_SCORE=45
ISSUE_IMAGE_REJECTION_CONFIDENCE=85
RESOLUTION_IMAGE_MIN_SCORE=55
RESOLUTION_IMAGE_REJECTION_CONFIDENCE=85
```

## Duplicate And History Tuning

Active duplicate detection and resolved historical recommendations are intentionally separate:

- Active duplicate checks only compare against unresolved issues: `Pending Approval`, `Open`, `In Progress`, and `Pending Verification`.
- Resolved issues are not used to block new reports. They are used as historical recommendations and community knowledge.
- `MONGO_ISSUE_VECTOR_INDEX` is the MongoDB Atlas Vector Search index name for the `Issue.embedding` field. Keep `ENABLE_ATLAS_VECTOR_SEARCH=false` unless that Atlas index exists. When false, the backend uses the safe bounded cosine-similarity fallback.

Conservative production/demo values:

```env
ENABLE_ATLAS_VECTOR_SEARCH=false
MONGO_ISSUE_VECTOR_INDEX=issue_embedding_index
DUPLICATE_SEMANTIC_THRESHOLD=0.86
DUPLICATE_STRONG_SEMANTIC_THRESHOLD=0.94
DUPLICATE_TEXT_THRESHOLD=0.42
DUPLICATE_STRONG_TEXT_THRESHOLD=0.62
DUPLICATE_DISTANCE_METERS=70
DUPLICATE_CANDIDATE_DISTANCE_METERS=130
DUPLICATE_IMAGE_CONFIDENCE=88
DUPLICATE_SPATIAL_CANDIDATE_LIMIT=200
HISTORICAL_TEXT_CANDIDATE_LIMIT=150
HISTORICAL_TEXT_MIN_SIMILARITY=0.16
HISTORICAL_SEMANTIC_MIN_SIMILARITY=0.68
```

Do not use very low duplicate values like `DUPLICATE_SEMANTIC_THRESHOLD=0.65`, `DUPLICATE_STRONG_SEMANTIC_THRESHOLD=0.75`, or `DUPLICATE_TEXT_THRESHOLD=0.20` for judging. Those are aggressive and can create false active duplicates. The history thresholds are intentionally lower because resolved issues should be surfaced as guidance, not used as blockers.

## Project Structure

```text
community-hero-backend/
  controllers/
  middleware/
  models/
  routes/
  scripts/
  services/
  utils/
  server.js

community-hero-frontend/
  public/
    _redirects
  src/
    api/
    components/
    utils/
    App.js
  static.json
  vercel.json
```

## Latest Architecture

- React SPA frontend with clean React Router paths, static-host rewrites, and a client-side fallback route.
- Express API backend with JWT identity, CORS allowlists, health checks, and optional Render keep-alive.
- MongoDB/Mongoose data layer for users, societies, issues, votes, notifications, analytics, history, and maintenance tasks.
- Google Maps drives radius/polygon community setup and map visualization.
- Google Gemini validates issue images, validates resolution proof, categorizes reports, and explains decisions.
- Google embeddings power active duplicate detection and resolved historical solution retrieval.
- Geofencing is enforced on the backend against the stored society radius or polygon; frontend labels are never trusted as authority.

## Backend Setup

```bash
cd community-hero-backend
npm install
npm start
```

Required backend environment variables:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
BACKEND_URL=http://localhost:5000
GEMINI_API_KEY=your_google_gemini_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
```

Use `community-hero-backend/.env.example` as the full backend template. In production, set `NODE_ENV=production` and set `CORS_ORIGINS` to the exact deployed frontend origin. For multiple allowed frontend origins, use a comma-separated list.

Optional Render/free-tier keep-alive variables:

```env
ENABLE_KEEP_ALIVE=true
BACKEND_URL=https://your-render-service.onrender.com
KEEP_ALIVE_URL=https://your-render-service.onrender.com/health
KEEP_ALIVE_INTERVAL_MS=300000
```

If `KEEP_ALIVE_URL` is omitted, the backend uses `BACKEND_URL + /health`. On Render web services, it can also fall back to Render's `RENDER_EXTERNAL_URL`. The keep-alive is disabled unless `ENABLE_KEEP_ALIVE=true`.

## Render Backend Deployment

For a Render backend deployment:

- Root directory: `community-hero-backend`
- Build command: `npm install`
- Start command: `npm start`
- Set `NODE_ENV=production`.
- Set `MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `OPENWEATHER_API_KEY`, and `CORS_ORIGINS`.
- Set `BACKEND_URL` to the public Render service URL, or rely on Render's `RENDER_EXTERNAL_URL`.
- Set `ENABLE_KEEP_ALIVE=true` if you want the backend to ping `/health` every 5 minutes.

If the hackathon final submission is evaluated strictly against the Google Cloud deployment requirement, deploy the public app on Google Cloud or clearly document any hybrid deployment choice in the project description.

## Firebase Frontend Deployment

The frontend is configured for Firebase Hosting with `firebase.json` at the repository root. The Firebase public directory is `community-hero-frontend/build`, and all frontend paths rewrite to `index.html` so refresh, direct links, and browser back/forward continue to work.

Production frontend values currently point to the Render backend:

```env
REACT_APP_BACKEND_URL=https://community-hero-sfsj.onrender.com
REACT_APP_API_BASE=https://community-hero-sfsj.onrender.com/api
```

For a manual Firebase deploy:

```bash
npx firebase-tools login
copy .firebaserc.example .firebaserc
# Edit .firebaserc and replace your-firebase-project-id with the real Firebase project ID.
cd community-hero-frontend
npm install
npm run build
cd ..
npx firebase-tools deploy --only hosting
```

After Firebase gives the hosted URL, add that frontend origin to the Render backend `CORS_ORIGINS` value. Example:

```env
CORS_ORIGINS=https://your-project-id.web.app,https://your-project-id.firebaseapp.com
```

GitHub Actions deployment is configured in `.github/workflows/firebase-hosting-live.yml`. Add these repository settings before expecting the workflow to pass:

- Repository variable `FIREBASE_PROJECT_ID`: your Firebase project ID.
- Repository secret `FIREBASE_SERVICE_ACCOUNT`: Firebase service account JSON for Hosting deploys.
- Repository secret `REACT_APP_GOOGLE_MAPS_API_KEY`: browser-restricted Google Maps key.

The workflow builds only `community-hero-frontend` and deploys the built static app to Firebase Hosting on pushes to `main` or `master`, and can also be run manually from GitHub Actions.

## Frontend Setup

```bash
cd community-hero-frontend
npm install
npm start
```

Required frontend environment variables:

```env
REACT_APP_API_BASE=http://localhost:5000/api
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Set `REACT_APP_API_BASE` directly, or set `REACT_APP_BACKEND_URL` and the client will append `/api`. Use `community-hero-frontend/.env.example` as the frontend template. React embeds `REACT_APP_*` values at build time, so set production URLs before running `npm run build`.

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

## React SPA Routing In Production

Community Hero has app routes such as `/dashboard`, `/issues/:issueId`, and `/create-issue`. Static hosting must rewrite unknown frontend paths back to `index.html`; otherwise refresh, direct links, or browser back/forward can show a host-level 404.

The frontend includes production fallback files:

- Root `render.yaml` with a Render static-site rewrite route for Blueprint deployments.
- `community-hero-frontend/public/_redirects` for Netlify-compatible static hosts.
- `community-hero-frontend/vercel.json` for Vercel rewrites.
- `community-hero-frontend/static.json` for static buildpack style hosts.
- A React Router `*` route that sends unknown in-app paths back to dashboard/login.

The app also uses `HashRouter`, so normal in-app navigation uses URLs like `/#/login`. This avoids host-level 404s even when a static host has not been configured perfectly.

For an existing manually-created Render Static Site, also add this in the Render dashboard:

```text
Redirects/Rewrites:
Source: /*
Destination: /index.html
Action: Rewrite
```

If your hosting provider has its own rewrite UI, configure:

```text
source: /*
destination: /index.html
status: 200
```

## Optional Local QA Seed

The backend includes a seed script for local developer QA, but the recommended judge path is to create fresh accounts and a fresh community at the evaluator's own location.

```bash
cd community-hero-backend
npm run seed:demo
```

The seed creates synthetic users, a community, active issues, resolved historical issues, duplicate examples, maintenance tasks, notifications, leaderboard entries, and community history. It is useful for developer regression testing, not required for judging.

Run the backend geofence QA checks:

```bash
cd community-hero-backend
npm run check:geofence
```

This verifies radius geofencing, polygon geofencing, authenticated join checks, login GPS behavior, admin approval safety, issue creation geofence rejection, admin resolution GPS requirements, and last-known-location checks for routine issue actions.

## From-Scratch Evaluation Walkthrough

This is the preferred judge flow. It does not require any pre-created account, private credential, or fixed physical location.

Before starting:

1. Open the deployed frontend in Chrome or Edge.
2. Allow browser location permission when prompted.
3. Stay physically inside the location that will represent the test community.
4. If testing from a desk or remote machine, use browser DevTools Sensors to set a consistent latitude/longitude. Use that same location for admin setup, resident join, login, and issue creation.
5. Keep two browser profiles/windows available: one for admin, one for residents.

### 1. Create Admin And Community

1. Open `/register`.
2. Register a new admin account with any evaluator-controlled email and password.
3. After registration, open the dashboard and click Create Community.
4. Click Lock Current Location and wait until GPS is locked.
5. Choose Radius mode for the fastest test. Use `150` to `250` meters as a practical radius.
6. Enter a society/community name and create the community.
7. Copy the generated Society ID from the admin dashboard.
8. Open the Community Map page and confirm the radius circle appears around the saved community center.

Polygon geofence test:

1. Create a second admin account only if you want to test drawn borders separately.
2. On Admin Setup, choose Draw Border.
3. Lock current location first.
4. Click at least three points around the current marker.
5. Create the community.
6. Confirm the map shows the polygon instead of only a radius circle.

### 2. Register Resident And Request Access

1. In a separate browser profile/window, open `/register`.
2. Register a resident account.
3. The resident starts without a society.
4. On the resident dashboard, paste the Society ID copied from the admin dashboard.
5. Click Verify Location.
6. The request should verify only if the current GPS is inside the community radius or polygon.
7. Click Request Join Access.
8. The resident should now show pending approval.

Negative geofence test:

1. Use DevTools Sensors to move the resident outside the radius or polygon.
2. Try Verify Location again with the same Society ID.
3. The backend should reject the request as outside the community geofence.
4. Move the sensor back inside before continuing.

### 3. Approve Resident

1. Return to the admin window.
2. Open the dashboard approval queue or Pending Residents page.
3. Confirm the resident appears as pending.
4. Approve the resident.
5. The resident should become an approved community member.

### 4. Login Geofence Check

1. Log out as the resident.
2. Log in again with the resident email/password.
3. The app first checks email/password, then requests GPS only for approved community residents.
4. With GPS inside the community, login should succeed.
5. With GPS outside the community, login should fail.

Admin note: admin login is not forced through geofence every time. Admin location is required during community setup and when an admin directly uploads a fix.

### 5. Create Issue

1. Log in as the approved resident.
2. Open Create Issue.
3. Upload or capture a JPG/JPEG/PNG image that clearly shows a practical issue.
4. Enter a title and description.
5. Click Verify GPS and wait for the map marker to lock.
6. Submit the issue.
7. Gemini should classify the image and text.
8. The issue should enter the approval workflow unless the AI confidently rejects the image as spam/unrelated/no visible issue.

Negative image test:

1. Upload an unrelated image.
2. If Gemini is highly confident the image is invalid, the backend should reject it before voting.
3. If Gemini is uncertain, the issue should continue to community verification instead of being hard-blocked.

### 6. Active Duplicate Test

1. While the first issue is still active, create a second issue with very similar title, description, image type, and nearby GPS.
2. The duplicate detector should compare active issues only.
3. If the match is strong enough, the new report should merge into or point to the existing active issue.
4. The creator should be directed to the existing issue rather than creating noisy duplicate work.

### 7. Historical Similarity Test

1. Resolve the original issue through the resolution flow below.
2. After it is resolved, create a future similar issue.
3. The resolved issue should not block the new report as an active duplicate.
4. Instead, the resolved issue should appear as a historical recommendation or community knowledge item.

### 8. Voting And Fairness

1. Register at least two more resident accounts and request/approve them using the same Society ID.
2. Confirm the issue creator cannot vote to approve their own issue.
3. Use another approved resident to vote for issue approval.
4. Confirm a solver cannot vote to verify their own resolution.
5. Use other residents to verify the final resolution.

### 9. Claim, Help, And Multi-Solver Flow

1. Open an approved active issue as a resident who did not create it.
2. Claim the issue.
3. Add a resolution/help note.
4. Request more community help if extra people are needed.
5. Join the same issue as another resident helper.
6. Confirm the issue allows multiple helpers while retaining one primary solver.

### 10. Resolution Flow

1. As the solver or admin, upload a resolved/fixed image.
2. Describe what was fixed in the resolution summary.
3. If the image clearly shows the issue still exists, Gemini should reject the resolution before voting.
4. If Gemini is uncertain, the resolution should move to community verification.
5. Other eligible residents vote on the resolution.
6. After enough verification, the issue should become Resolved.
7. Resolved issues should leave active issue lists and appear in history/knowledge.

### 11. Admin Direct Fix

1. Log in as admin.
2. Open an active issue.
3. If the admin is physically inside the community geofence, upload a fix and resolution summary.
4. The fix should follow the same AI validation and community verification safety gates.

### 12. Dashboard And Support Pages

Verify these pages after creating data:

- Dashboard cards update for role, society, members, points, notifications, history, and knowledge.
- Community Map shows the saved radius or polygon.
- Active Issues excludes resolved issues.
- Issue Details shows AI category, semantic/image similarity fields, comments, helpers, votes, and resolution data.
- Maintenance Board shows scheduled or generated tasks.
- Leaderboard and achievements update after reporting, claiming, resolving, and voting.
- Notifications reflect duplicate merges, approvals, claims, help requests, and resolutions.

## Hackathon Submission Checklist

The Vibe2Ship guidelines require:

- A publicly accessible deployed application link hosted on Google Cloud.
- A GitHub repository link with source code and documentation.
- A Google Doc project description accessible to anyone with the link.
- The selected problem statement, solution overview, key features, technologies used, and Google technologies utilized.
- Final submission through the BlockseBlock platform, including the final submit step.

For a stronger evaluation:

- Make the first demo path the from-scratch walkthrough so judges can test at their own physical location.
- Show Google AI usage clearly: Gemini Vision/text reasoning, Gemini embeddings, and Google Maps geofencing.
- Demonstrate agentic depth through duplicate prevention, historical recommendations, proactive maintenance/weather intelligence, and resolution verification.
- Keep the deployed app stable during the full evaluation period.
- Include the from-scratch test steps, required environment setup, and Google Maps browser-location notes in the Google Doc and README.

## Main Flows To Verify

1. Register as admin.
2. Create a community using radius or polygon mode.
3. Register as resident.
4. Enter Society ID.
5. Verify GPS inside the community boundary.
6. Request access.
7. Approve resident as admin.
8. Login as approved resident with fresh GPS.
9. Create an issue inside the community.
10. Vote, claim, comment, request help, upload fix, and verify resolution.
11. Confirm resolved issues move into history and knowledge.
12. Confirm future similar issues are allowed when the old matching issue is resolved.

## Important Backend Files

- `community-hero-backend/utils/geofenceService.js`: radius and polygon verification.
- `community-hero-backend/middleware/geoGuard.js`: fresh GPS enforcement for issue creation and last-known-location enforcement for routine issue actions.
- `community-hero-backend/controllers/societyController.js`: community creation, join verification, resident approval.
- `community-hero-backend/controllers/authController.js`: login geofence enforcement.
- `community-hero-backend/controllers/issueController.js`: issue lifecycle, duplicate handling, approvals, claims, fixes, help requests, and resolution verification.

## Important Frontend Files

- `community-hero-frontend/src/components/AdminSetup.js`: radius or polygon community creation.
- `community-hero-frontend/src/components/Dashboard.js`: resident join flow and admin approval flow.
- `community-hero-frontend/src/components/CreateIssue.js`: geofenced issue creation.
- `community-hero-frontend/src/components/IssueDetails.js`: geofenced issue actions.
- `community-hero-frontend/src/components/DashboardWidgets.js`: community map, analytics, history, knowledge, and dashboard panels.

## Current Geofence Principle

Do not trust client-side labels like "verified" by themselves. A location is valid only when the backend checks it against the stored society boundary. Fresh GPS is required for join, login, and issue creation; routine issue actions reuse the last backend-verified location to keep the user flow smooth.
