# Community Hero

## Project Submission Brief

Project name: Community Hero

Selected problem statement: Problem Statement 2 - Community Hero: Hyperlocal Problem Solver

GitHub repository: https://github.com/ritvikraj115/Community-Hero

Live application: https://chero-r115-20260630.web.app

Alternate Firebase Hosting URL: https://chero-r115-20260630.firebaseapp.com

## Solution Overview

Community Hero is an AI-powered, geofenced civic operations platform for residential societies, gated communities, campuses, and smart neighborhoods. It transforms local issue reporting from a loosely coordinated chat-based process into a structured, verifiable, and accountable workflow for identifying, validating, resolving, and learning from hyperlocal problems such as water leaks, potholes, damaged lights, waste issues, broken infrastructure, and recurring maintenance failures.

The solution is designed around the full operational lifecycle of a civic issue. An admin defines the community boundary using Google Maps, either through a radius-based geofence or a manually marked polygon. Residents can join only after their physical location is verified against that boundary. Once approved, residents can report issues with an image, description, and GPS location. Google Gemini then evaluates the report, classifies the issue, estimates severity, identifies likely causes, flags high-confidence spam or invalid uploads, and supports duplicate detection and historical recommendation workflows.

Community Hero also addresses the trust and accountability gaps that usually prevent local reporting systems from working well. Issue creators cannot approve their own reports, solvers cannot verify their own fixes, and every resolution requires proof plus a written description. Multiple residents can collaborate on the same issue, admins can directly upload fixes, and resolved issues become reusable community knowledge rather than disappearing as closed tickets.

## Why Community Hero Stands Out

Community Hero differentiates itself by treating hyperlocal problem solving as a complete civic operations workflow rather than a simple complaint form. The platform combines location trust, AI-assisted reasoning, community verification, and institutional memory into one cohesive experience.

Its key differentiators are:

- Geofence-first trust model: community access, resident login, issue creation, and on-site work are validated against the saved society boundary, reducing fake participation and off-site reporting.
- AI-assisted decision support: Gemini classifies issues, explains risk, compares similarity, and detects high-confidence spam while uncertain cases remain under community review instead of being rejected automatically.
- Duplicate prevention with historical reuse: unresolved duplicate reports are merged to avoid split effort, while resolved similar issues are surfaced as guidance for future incidents.
- Fair community governance: creator self-approval and solver self-verification are blocked, making the workflow more credible for residents, admins, and evaluators.
- Collaborative resolution model: each issue can support a primary solver, multiple helpers, help requests, admin-submitted fixes, resolution proof, and community verification.
- Community memory: useful reports and fixes contribute to future recommendations, maintenance planning, analytics, and resident accountability.
- Production-ready delivery: the React frontend is deployed on Firebase Hosting with SPA route rewrites and GitHub Actions deployment automation.

## Current Deployment Setup

The live evaluator-facing application is deployed on Firebase Hosting:

- Primary URL: https://chero-r115-20260630.web.app
- Alternate URL: https://chero-r115-20260630.firebaseapp.com
- Firebase project ID: `chero-r115-20260630`
- Hosting site: `chero-r115-20260630`

The React production build is deployed as a static single page application. Firebase Hosting rewrites all app routes to `index.html`, so direct links, refresh, browser back, and routes such as `/login`, `/dashboard`, `/issues`, and `/create-issue` work correctly.

The GitHub repository is connected to Firebase Hosting through GitHub Actions. On every push to `main`, the workflow builds the frontend and deploys the latest production bundle to Firebase Hosting. Required deployment secrets and variables are configured in the repository.

## Product Workflow

### Community Creation

An admin registers, logs in, opens community setup, and locks the current location. The admin can then choose Radius mode or Polygon mode. Radius mode stores a center point and a radius in meters. Polygon mode stores a manually marked GeoJSON boundary on Google Maps. The system saves this geofence and attaches the admin to the newly created society.

### Resident Onboarding

A resident registers without being attached to any community. The resident enters the Society ID shared by the admin and verifies current GPS location. The system checks that GPS point against the selected society boundary. If the resident is physically inside the community, the join request becomes pending. The admin can then review and approve the resident.

### Login Geofencing

Approved residents are checked against their assigned community during login. The system first identifies the resident from email and password, then verifies the submitted GPS location against that resident's society boundary. Resident login succeeds only when the location is inside the community geofence.

Admin login is intentionally smoother. Admins are location-verified during community setup and when submitting or resolving on-site issue work, but they are not forced through the resident login geofence every time.

### Issue Reporting

An approved resident creates an issue by uploading an image, adding a title and description, and locking GPS. The system verifies that the issue location is inside the resident's society boundary. Gemini then evaluates the report. If Gemini is highly confident that the image is spam, unrelated, or does not show a real civic issue, the report is rejected before community voting. If Gemini is uncertain, the system avoids making a hard decision and allows the community verification flow to continue.

### Duplicate And History Intelligence

Community Hero uses text similarity, location similarity, image comparison, and Gemini embeddings to detect active duplicates. If a similar unresolved issue already exists nearby, the new report is merged into the existing issue so the community does not split effort.

Resolved issues behave differently. They do not block future reports, because the same type of issue can happen again later. Instead, resolved issues become historical knowledge. When a similar future issue is reported, the platform surfaces previous fixes and resolution context as guidance.

### Collaboration And Resolution

After approval, an issue becomes open for action. A resident can claim responsibility, other members can join as helpers, and the solver or admin can request additional help with a reason. When the work is done, the solver or admin uploads resolution proof and describes the fix. Gemini checks whether the proof is valid and whether the original issue still appears to persist. High-confidence invalid fixes are rejected early; uncertain cases proceed to community verification.

Once eligible residents verify the resolution, the issue moves out of active issues and becomes part of the community's history and knowledge base.

## Core Differentiators and Features

- Boundary-aware community setup using either radius-based geofencing or manually marked polygon borders on Google Maps.
- GPS-verified resident onboarding so community membership is tied to physical presence inside the selected society.
- Identity-bound resident login geofencing for approved residents.
- Image-based issue reporting with JPG, JPEG, PNG, WEBP, HEIC, and HEIF support.
- Gemini-powered issue understanding across category, severity, root cause, tags, risk, and concise explanations.
- AI safety gates that reject high-confidence spam, unrelated images, invalid issue proof, invalid resolution proof, and issue-still-present cases before they waste community voting effort.
- Hybrid duplicate detection using spatial proximity, text similarity, image comparison, category signals, and Gemini embeddings.
- Historical recommendation system that turns resolved issues into reusable community knowledge without blocking legitimate future reports.
- Community verification for both issue approval and resolution approval.
- Governance rules that block creator self-approval and solver self-verification.
- Multi-helper solving flow with help requests, primary ownership, admin direct fixes, and resolution descriptions.
- Notifications for joins, approvals, duplicate merges, claims, help requests, and resolutions.
- Gamification with points, leaderboard, achievements, and resident contribution history.
- Operational dashboards for analytics, community health, knowledge, history, feed, weather context, and maintenance planning.
- Maintenance board for scheduled and proactive work.
- Firebase Hosting deployment with SPA route rewrites and GitHub Actions continuous deployment.

## Architecture

Community Hero uses a React single page frontend with an API-backed workflow and MongoDB persistence.

Frontend:

- React SPA with role-based admin and resident flows.
- React Router configured for static hosting compatibility.
- Axios API client with JWT authorization.
- Google Maps JavaScript API through `@react-google-maps/api`.
- Dedicated screens for admin setup, dashboard, issue creation, issue details, maintenance, leaderboard, and profile views.

API and data layer:

- Express REST API for authentication, societies, issues, voting, maintenance, notifications, reports, and analytics.
- MongoDB with Mongoose models.
- JWT authentication and role checks.
- Geofence middleware for society-bound workflows.
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

Firebase Hosting:

- Hosts the live React frontend.
- Serves the production static build.
- Rewrites all frontend routes to `index.html` for smooth SPA navigation.
- Integrates with GitHub Actions for continuous deployment.

## Technology Stack

Frontend:

- React
- React Router
- Axios
- CSS
- Google Maps JavaScript API
- `@react-google-maps/api`
- Firebase Hosting
- GitHub Actions

API, AI, and data:

- Node.js
- Express
- MongoDB
- Mongoose
- JWT authentication
- Bcrypt password hashing
- Multer image uploads
- Google Gemini API through `@google/generative-ai`
- Gemini multimodal image reasoning
- Gemini embeddings
- MongoDB geospatial indexes
- MongoDB vector-search-compatible design with fallback cosine similarity
- Hybrid duplicate detection across semantic, text, image, and spatial signals

## Evaluation Alignment

Problem Solving and Impact:

Community Hero directly addresses fragmented local issue reporting by combining reporting, verification, tracking, resolution, and institutional memory in one workflow. It gives residents transparency, gives admins operational control, and reduces the repeated manual coordination that usually happens across chats, calls, and informal complaint registers.

Agentic Depth:

Gemini is not used as a superficial labeling layer. It reasons over issue images, descriptions, spam risk, severity, root causes, duplicate likelihood, and resolution validity. The product uses that reasoning to route workflow decisions while deliberately preserving human/community judgment when AI confidence is low.

Innovation and Creativity:

The platform stands out by combining geofencing, AI image reasoning, semantic issue memory, active duplicate merging, fair voting rules, collaborative solving, gamification, and historical recommendations into a practical community product. The most important innovation is the separation between active duplicates and resolved history: current duplicates are merged, while past solutions become guidance.

Usage of Google Technologies:

Gemini, Google embeddings, Google Maps, and Firebase Hosting are core to the product experience. They support image understanding, semantic retrieval, duplicate intelligence, geofence creation, community visualization, and live frontend deployment. These integrations are part of the main workflow rather than isolated add-ons.

Product Experience and Design:

The app is designed around the daily needs of admins and residents rather than a generic dashboard. It provides role-specific views, guided community setup, smooth resident onboarding, structured issue creation, active issue tracking, resolution proof, notifications, leaderboard, history, and maintenance workflows.

Technical Implementation:

The system enforces identity, role, society membership, geofence checks, upload validation, AI gates, duplicate logic, and workflow transitions across the product. The frontend is deployed on Firebase Hosting with production static routing and GitHub Actions automation.

Completeness and Usability:

The product supports the full end-to-end journey: create a community, onboard residents, report issues, detect active duplicates, approve issues, collaborate on fixes, verify resolutions, show history, and reuse prior knowledge for future problems. This makes the project evaluation-ready from the deployed frontend instead of requiring manual database setup.

## Evaluator Walkthrough

1. Open the deployed frontend: https://chero-r115-20260630.web.app
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
- `firebase.json`
- `.github/workflows/firebase-hosting-live.yml`

## Closing Statement

Community Hero is designed as a complete hyperlocal problem-solving platform for real communities. Its value lies in combining trustworthy location boundaries, AI-assisted evidence review, fair community verification, collaborative resolution, and long-term knowledge retention. With Google AI, Google Maps, and Firebase Hosting integrated into the core workflow, the project presents a practical, production-oriented solution for communities that need more than a complaint box: they need a reliable system for turning local problems into verified, resolved, and reusable civic knowledge.
