# AI Tool Usage Disclosure

**Tool used:** Claude Code (Anthropic's Claude, in the Claude desktop app). It was the main tool for this assessment: it wrote most of the code and documentation under my direction, ran the tests and builds, and helped with deployment.

## What the AI did

- **Planning.** Read the brief with me, listed the requirements and deliverables, and proposed the open assumptions (for example, that students also sign in with Google and choose a role once). I decided which assumptions to keep.
- **API contract.** Drafted [`API.md`](API.md) — endpoints, payloads, error codes, auth rules and the QR payload format — as the single contract for both sides.
- **Code.** At my request, two AI agents worked in parallel from that contract: one built the backend (Express, PostgreSQL schema and migrations, auth, tests), the other the Expo app. Both followed specifications for architecture, security, error handling and UX states.
- **Verification.** Ran backend type checks and the 41 integration tests against a real PostgreSQL database, mobile type checks and unit tests, and drove the app on an Android emulator and an iOS simulator against the local backend. This testing found two navigation bugs (a stray back button after a deep-link join, and a profile-screen warning), which it then fixed.
- **Documentation.** Drafted the README, the development approach and this disclosure.
- **Setup and deployment.** Created the Android and iOS Google OAuth clients, configured the Neon database and the Render web service in the browser, ran migrations and seed data, built the release APK and published the GitHub release.

## What I did

- Set the direction and made the decisions: scope, assumptions, building in parallel, hosting choices (Render + Neon, Frankfurt), repository visibility, and what to test and ship.
- Handled every account and credential step myself: signing in to Google Cloud, Neon, Render and GitHub, approving GitHub access for Render, adding the payment card Render requires, and creating the Google Web OAuth client.
- Tested Google Sign-In end to end with my own Google accounts on the device, as both a teacher and a student.
- Went through the code with the assistant — the backend layers, the request flow, the database schema, the auth and refresh-token design, and Expo's role in the stack — so that I can explain and justify the design decisions.

## Ownership

I'm responsible for the submission. I can explain the architecture and its trade-offs: the auth flow (Google ID token → own JWT access token + rotating refresh tokens with reuse detection), the database schema and constraints, the authorization rules (404 instead of 403, students never see join codes), join-code rate limiting, and the mobile state-management split (react-query for server state, zustand for the session).
