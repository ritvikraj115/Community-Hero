# Community Hero

## Project Submission Brief

Project name: Community Hero

Selected problem statement: Problem Statement 2 - Community Hero: Hyperlocal Problem Solver

GitHub repository: https://github.com/ritvikraj115/Community-Hero

Current live demo deployment: https://community-hero-frontend-i725.onrender.com

## Google Cloud Deployment Note

The hackathon guideline asks for a Google Cloud hosted deployment. I attempted to complete the Google Cloud deployment, but Google Cloud billing activation is currently blocked on my side. Autopay is already set up on my phone, I tried different Google accounts, and I also tried adding a card manually; however, the billing setup is still not reflecting correctly in Google Cloud Console.

I have already mailed the organizers about this issue from `ritvikraj.ipl@gmail.com`. Until the Google Cloud billing issue is resolved, I request the evaluators to please consider the Render deployment as the live functional demo and judge the project unbiasedly based on the working product, source code, architecture, and Google technology integrations. The application is already structured to be deployed on Google Cloud once billing access becomes available.

## Solution Overview

Community Hero is an AI-powered, geofenced civic issue management platform for residential societies, gated communities, campuses, and smart neighborhoods. It helps a community report, verify, track, resolve, and learn from hyperlocal problems such as water leaks, potholes, damaged lights, waste issues, broken infrastructure, and other neighborhood-level concerns.

The product is built around the complete lifecycle of a community issue. An admin creates a community boundary using Google Maps, either by selecting a radius around the current location or by manually marking a polygon boundary. Residents can join only when their current GPS location is inside that community boundary. Once approved, residents can report issues with an image, description, and location. Google Gemini analyzes the report, detects spam or invalid uploads when confidence is high, classifies the issue, estimates severity, and supports the duplicate and history system.

The platform keeps the workflow fair. Issue creators cannot approve their own reports, and solvers cannot verify their own fixes. More than one resident can collaborate on the same issue, admins can upload direct fixes, and every resolution requires useful proof and a description so the community builds future knowledge instead of only closing tickets.

## Product Workflow

### Community Creation

An admin registers, logs in, opens community setup, and locks the current location. The admin can then choose Radius mode or Polygon mode. Radius mode stores a center point and a radius in meters. Polygon mode stores a manually marked GeoJSON boundary on Google Maps. The backend saves this geofence and attaches the admin to the newly created society.

### Resident Onboarding

A resident registers without being attached to any community. The resident enters the Society ID shared by the admin and verifies current GPS location. The backend checks that GPS point against the selected society boundary. If the resident is physically inside the community, the join request becomes pending. The admin can then review and approve the resident.

### Login Geofencing

Approved residents are checked against their assigned community during login. The backend first identifies the resident from email and password, then verifies the submitted GPS location against that resident's society boundary. Resident login succeeds only when the location is inside the community geofence.

Admin login is intentionally smoother. Admins are location-verified during community setup and when submitting or resolving on-site issue work, but they are not forced through the resident login geofence every time.

### Issue Reporting

An approved resident creates an issue by uploading an image, adding a title and description, and locking GPS. The backend verifies that the issue location is inside the resident's society boundary. Gemini then evaluates the report. If Gemini is highly confident that the image is spam, unrelated, or does not show a real civic issue, the report is rejected before community voting. If Gemini is uncertain, the system avoids making a hard decision and allows the community verification flow to continue.

### Duplicate And History Intelligence

Community Hero uses text similarity, location similarity, image comparison, and Gemini embeddings to detect active duplicates. If a similar unresolved issue already exists nearby, the new report is merged into the existing issue so the community does not split effort.

Resolved issues behave differently. They do not block future reports, because the same type of issue can happen again later. Instead, resolved issues become historical knowledge. When a similar future issue is reported, the platform surfaces previous fixes and resolution context as guidance.

### Collaboration And Resolution

After approval, an issue becomes open for action. A resident can claim responsibility, other members can join as helpers, and the solver or admin can request additional help with a reason. When the work is done, the solver or admin uploads resolution proof and describes the fix. Gemini checks whether the proof is valid and whether the original issue still appears to persist. High-confidence invalid fixes are rejected early; uncertain cases proceed to community verification.

Once eligible residents verify the resolution, the issue moves out of active issues and becomes part of the community's history and knowledge base.

## Key Features

- Admin community setup with radius or manually marked polygon geofence.
- Google Maps based community map with society boundary, issue markers, and maintenance markers.
- Resident join requests with GPS verification against the selected society.
- Identity-bound resident login geofence.
- Issue creation with backend geofence enforcement.
- Image-based issue reporting with JPG, JPEG, PNG, WEBP, HEIC, and HEIF support.
- Gemini-powered image and text analysis for category, severity, root cause, tags, risk, and summary.
- AI safety gates for spam reports, unrelated images, invalid issue proof, invalid resolution proof, and issue-still-present cases.
- Active duplicate detection using spatial, text, image, category, and semantic signals.
- Historical recommendation system for resolved similar issues.
- Community voting for issue approval and resolution verification.
- Fairness rules that block creator self-approval and solver self-verification.
- Multi-helper solving flow with help requests.
- Admin direct fix upload.
- Notifications for joins, approvals, duplicate merges, claims, help requests, and resolutions.
- Gamification with points, leaderboard, achievements, and contribution history.
- Dashboard panels for analytics, health score, community knowledge, history, feed, weather, and maintenance.
- Maintenance board for scheduled and proactive work.
- Production-ready environment configuration for frontend and backend deployment.

## Architecture

Community Hero uses a React single page frontend and a Node.js Express backend.

Frontend:

- React SPA with role-based admin and resident flows.
- React Router configured for static hosting compatibility.
- Axios API client with JWT authorization.
- Google Maps JavaScript API through `@react-google-maps/api`.
- Dedicated screens for admin setup, dashboard, issue creation, issue details, maintenance, leaderboard, and profile views.

Backend:

- Node.js and Express REST API.
- MongoDB with Mongoose models.
- JWT authentication and role checks.
- Backend geofence middleware for society-bound workflows.
- Multer upload handling for common image formats.
- Gemini services for issue analysis and resolution verification.
- Gemini embeddings for semantic duplicate detection and historical issue retrieval.
- Notification, gamification, leaderboard, maintenance, analytics, weather, and audit services.

Database:

- `User`: identity, role, society membership, join status, gamification, and last verified location.
- `Society`: admin, center point, radius, polygon boundary, geofence mode, and community metadata.
- `Issue`: image, GPS location, AI analysis, votes, status, solver, helpers, duplicate metadata, embeddings, and resolution proof.
- `Vote`: approval and resolution verification records.
- `Notification`: workflow alerts and activity updates.
- `MaintenanceTask`: scheduled or proactive maintenance items.
- `IssueHistory`, `UserHistory`, `CommunityInsights`, `CommunityAnalytics`, and `Leaderboard`: community memory, analytics, and gamification records.

## Google Technologies Utilized

Google Gemini:

- Analyzes issue images and descriptions.
- Classifies civic problems.
- Estimates severity and operational risk.
- Infers likely root causes.
- Generates tags and concise summaries.
- Validates resolution proof.
- Detects spam, unrelated uploads, and invalid images using confidence thresholds.

Google Embeddings:

- Converts issue summaries into semantic vectors.
- Supports active duplicate detection.
- Retrieves similar resolved issues as historical guidance.
- Powers the community knowledge system.

Google Maps JavaScript API:

- Displays the admin setup map.
- Shows current location during community creation.
- Visualizes radius and polygon geofences.
- Powers manual polygon boundary marking.
- Displays issue and maintenance markers on the community dashboard.

Google Cloud:

- The codebase is deployment-ready for Google Cloud once billing access is available.
- Recommended Google Cloud deployment shape is a static frontend deployment plus backend API on Cloud Run.
- Environment variables are already separated for frontend URL, backend URL, CORS origins, JWT secret, MongoDB URI, Google API keys, Gemini model names, embedding dimensions, and threshold tuning.

## Technology Stack

Frontend:

- React
- React Router
- Axios
- CSS
- Google Maps JavaScript API
- `@react-google-maps/api`

Backend:

- Node.js
- Express
- MongoDB
- Mongoose
- JWT authentication
- Bcrypt password hashing
- Multer image uploads
- CORS
- Node cron jobs

AI and data:

- Google Gemini API through `@google/generative-ai`
- Gemini multimodal image reasoning
- Gemini embeddings
- MongoDB geospatial indexes
- MongoDB vector-search-compatible design with fallback cosine similarity
- Hybrid duplicate detection across semantic, text, image, and spatial signals

Deployment and operations:

- Environment-based configuration.
- Static frontend build.
- Express API service.
- Health check endpoint.
- Optional keep-alive flow for free-tier backend hosting.
- Render deployment currently used as the public live demo because Google Cloud billing activation is blocked.

## Evaluation Alignment

Problem Solving and Impact:

Community Hero directly solves fragmented local issue reporting by combining reporting, verification, tracking, resolution, and history in one workflow. It gives residents transparency and gives admins a practical operating view of community problems.

Agentic Depth:

Gemini is not used only for labels. It helps reason about images, descriptions, spam risk, severity, root causes, duplicate likelihood, and resolution validity. The system uses that reasoning to route workflow decisions while still avoiding hard rejection when AI confidence is low.

Innovation and Creativity:

The platform combines geofencing, AI image reasoning, semantic issue memory, duplicate merging, fair voting rules, collaborative solving, gamification, and historical recommendations into a practical community product.

Usage of Google Technologies:

Gemini, Google embeddings, and Google Maps are core to the product experience. They are used for image understanding, semantic retrieval, duplicate intelligence, geofencing UI, and community visualization.

Product Experience and Design:

The app has role-specific dashboards, clear community setup, smooth resident onboarding, guided issue creation, active issue tracking, resolution proof, notifications, leaderboard, history, and maintenance workflows.

Technical Implementation:

The backend enforces identity, role, society membership, geofence checks, upload validation, AI gates, duplicate logic, and workflow transitions. The frontend is configured for production static hosting and environment-based API URLs.

Completeness and Usability:

The product supports the full end-to-end journey: create a community, onboard residents, report issues, detect duplicates, approve issues, collaborate on fixes, verify resolutions, show history, and reuse prior knowledge for future problems.

## Evaluator Walkthrough

1. Open the deployed frontend.
2. Register an admin account using an evaluator-controlled email.
3. Create a community at the evaluator's current location.
4. Choose Radius mode with a practical radius such as 150 to 250 meters, or mark a polygon boundary around the current location.
5. Copy the generated Society ID.
6. Register a resident account in a separate browser profile.
7. Enter the Society ID and verify resident location.
8. Submit the join request.
9. Return to the admin account and approve the resident.
10. Log out and log in again as the resident to verify resident login geofencing.
11. Create an issue with an image, title, description, and GPS location.
12. Register and approve at least two more residents to test community voting fairness.
13. Vote to approve the issue using eligible residents.
14. Claim the issue as a resident who did not create it.
15. Request help and join the same issue as another helper.
16. Upload resolution proof with a written summary of the fix.
17. Confirm that the solver cannot verify their own fix.
18. Use other residents to verify the resolution.
19. Confirm that the issue moves to Resolved and appears in history or knowledge.
20. Create a similar future issue and confirm that resolved historical issues appear as recommendations instead of blocking the new report.

Suggested negative checks:

- Try joining a society without entering a Society ID.
- Use browser DevTools Sensors to simulate a location outside the community boundary.
- Try resident login from outside the geofence.
- Upload an unrelated issue image and confirm high-confidence spam is blocked.
- Upload resolution proof where the issue is still visible and confirm high-confidence invalid fixes are blocked.
- Try creator self-approval and solver self-verification.

## Implementation Reference

Representative frontend files:

- `community-hero-frontend/src/App.js`
- `community-hero-frontend/src/api/client.js`
- `community-hero-frontend/src/components/AdminSetup.js`
- `community-hero-frontend/src/components/Dashboard.js`
- `community-hero-frontend/src/components/CreateIssue.js`
- `community-hero-frontend/src/components/IssueDetails.js`
- `community-hero-frontend/src/components/DashboardWidgets.js`
- `community-hero-frontend/src/utils/location.js`
- `community-hero-frontend/src/utils/googleMaps.js`

Representative backend files:

- `community-hero-backend/server.js`
- `community-hero-backend/routes/apiRoutes.js`
- `community-hero-backend/controllers/authController.js`
- `community-hero-backend/controllers/societyController.js`
- `community-hero-backend/controllers/issueController.js`
- `community-hero-backend/middleware/auth.js`
- `community-hero-backend/middleware/geoGuard.js`
- `community-hero-backend/utils/geofenceService.js`
- `community-hero-backend/utils/googleEmbeddingService.js`
- `community-hero-backend/utils/hybridDuplicateDetector.js`
- `community-hero-backend/utils/imageComparisonService.js`
- `community-hero-backend/utils/knowledgeBaseService.js`

## Closing Statement

Community Hero is designed as a complete hyperlocal problem-solving platform for real communities. It uses Google AI and Google Maps to make civic issue reporting intelligent, location-aware, collaborative, and transparent. The system reduces duplicate effort, verifies problems fairly, supports multi-person resolution, and preserves historical knowledge so communities become better at solving recurring problems over time.
