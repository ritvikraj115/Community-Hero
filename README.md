# Community Hero

Community Hero is an AI-powered civic issue management platform for gated communities, residential societies, campuses, and smart neighborhoods. It combines Google Gemini, Google embeddings, Google Maps geofencing, MongoDB, role-based workflows, and community verification so residents can report, validate, resolve, and learn from local problems.

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
  src/
    api/
    components/
    App.js
```

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

## Demo Data

The backend includes a practical MongoDB seed script for testing the complete flow.

```bash
cd community-hero-backend
npm run seed:demo
```

The seed creates:

- One radius-based demo community with real GPS center support.
- One admin.
- Five approved residents.
- One pending resident.
- One resident for testing the join flow.
- Active issues.
- Resolved historical issues.
- Duplicate-detection examples.
- Maintenance tasks.
- Notifications.
- Leaderboard entries.
- Community knowledge and history.

The geofence QA script additionally creates and removes temporary polygon communities to verify drawn-border behavior.

All seeded demo accounts use:

```text
Password: Demo@12345
```

Demo emails:

```text
admin@demo.communityhero.local
resident1@demo.communityhero.local
resident2@demo.communityhero.local
resident3@demo.communityhero.local
resident4@demo.communityhero.local
resident5@demo.communityhero.local
pending@demo.communityhero.local
joinflow@demo.communityhero.local
```

The script prints the generated Society ID after seeding. Use that ID when testing resident join flow.

Run the backend QA checks:

```bash
cd community-hero-backend
npm run check:geofence
```

This verifies radius geofencing, polygon geofencing, authenticated join checks, login GPS behavior, admin approval safety, issue creation geofence rejection, admin resolution GPS requirements, and last-known-location checks for routine issue actions.

## Evaluator Fast Path

If hackathon advisors do not want to spend time creating communities, residents, issues, maintenance tasks, and history manually, they can use the seeded demo data directly.

Fastest review path:

1. Run `npm run seed:demo` once on the backend, or use the already seeded deployed database.
2. Log in as `admin@demo.communityhero.local` with password `Demo@12345` to inspect the admin dashboard, community map, active issues, approvals, analytics, maintenance, leaderboard, notifications, and history.
3. For approved resident flows, log in with `resident1@demo.communityhero.local` and password `Demo@12345`.
4. Resident login requires GPS inside the seeded community. If the evaluator is remote, use browser location override/devtools sensors with the center printed by the seed script.
5. To test a new resident joining, log in as `joinflow@demo.communityhero.local`, paste the Society ID visible in the admin dashboard, verify location with the same seeded center, and request access.

Seeded data includes active duplicate examples, resolved historical issues, pending approval, pending verification, multi-helper resolution teams, maintenance tasks, notifications, analytics, community knowledge, and leaderboard entries.

## Hackathon Submission Checklist

The Vibe2Ship guidelines require:

- A publicly accessible deployed application link hosted on Google Cloud.
- A GitHub repository link with source code and documentation.
- A Google Doc project description accessible to anyone with the link.
- The selected problem statement, solution overview, key features, technologies used, and Google technologies utilized.
- Final submission through the BlockseBlock platform, including the final submit step.

For a stronger evaluation:

- Make the first demo path use seeded data so judges see value immediately.
- Show Google AI usage clearly: Gemini Vision/text reasoning, Gemini embeddings, and Google Maps geofencing.
- Demonstrate agentic depth through duplicate prevention, historical recommendations, proactive maintenance/weather intelligence, and resolution verification.
- Keep the deployed app stable during the full evaluation period.
- Include demo credentials and GPS override coordinates in the Google Doc and README.

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
