# Wide Impact Classroom

A mobile app where **teachers** sign in with Google, create and manage classrooms, and **students** join a classroom by **scanning a QR code** or **typing a 6‑digit code**.

## Try it now

| | |
|---|---|
| **Android APK** | [Download from release v1.0.0](https://github.com/moaazsalama/wide-impact-classroom/releases/tag/v1.0.0) (`wide-impact-classroom.apk`) |
| **Live API** | `https://wide-impact-classroom-api.onrender.com` ([health check](https://wide-impact-classroom-api.onrender.com/health)) |
| **Sign in** | Tap a one-tap test account ([below](#test-accounts)), or *Continue with Google* |

Install the APK on an Android phone (allow "Install unknown apps" if asked) or on an emulator with `adb install wide-impact-classroom.apk`.

> The API runs on Render's free tier, which sleeps when idle: **the first request after a pause can take 30–50 seconds**. After that it responds normally.

```
wide-impact-classroom/
├── backend/            Node.js + Express 5 + PostgreSQL REST API (TypeScript)
├── mobile/             React Native + Expo app (TypeScript, expo-router)
├── docs/
│   ├── API.md          Full API reference (endpoints, payloads, errors, auth)
│   ├── APPROACH.md     Architecture, decisions, trade-offs, next steps
│   └── AI_DISCLOSURE.md
└── docker-compose.yml  Optional local PostgreSQL
```

## Features

**Teacher**
- Google sign-in, one-time role selection
- Create, edit, delete classrooms (name, subject, description)
- Each classroom has a unique 6‑digit join code shown as a large code **and** a QR code
- Copy / share the code (share message includes a `wideimpactclassroom://join?code=…` deep link)
- Regenerate the code (old code stops working immediately)
- See enrolled students (name, email, joined date, joined via QR or code) and remove a student

**Student**
- Google sign-in, one-time role selection
- Join by scanning the QR code (camera) or typing the code (6-box input with paste + auto-submit)
- Preview the classroom (name, teacher, size) before confirming the join
- Opening a `wideimpactclassroom://join?code=…` link goes straight to the join confirmation (after sign-in if needed)
- List of joined classrooms, classroom details, leave a classroom

**Cross-cutting**: rotating refresh tokens with reuse detection, rate-limited join/lookup endpoints (code-guessing protection), loading / empty / error-with-retry states everywhere, pull-to-refresh, confirmation dialogs for destructive actions.

## Tech stack

| Layer | Technology |
|---|---|
| Mobile | React Native 0.88, **Expo SDK 58**, TypeScript, expo-router (typed routes) |
| Mobile state | @tanstack/react-query (server state), zustand (session), expo-secure-store (tokens) |
| Mobile libs | axios, expo-camera (QR scanning), react-native-qrcode-svg (QR generation), @react-native-google-signin/google-signin, expo-linking, expo-clipboard |
| Backend | Node.js, **Express 5**, TypeScript, zod (validation), pino (logging), helmet, cors, express-rate-limit |
| Auth | Google ID token verification (google-auth-library) → own JWT access token (15 min) + opaque rotating refresh token (30 days, SHA-256 hashed at rest) |
| Database | **PostgreSQL** (node-postgres, plain SQL migrations) |
| Tests | Backend: vitest + supertest against a real Postgres (41 integration tests). Mobile: jest-expo (QR payload parser). |

## Quick start (local)

Prerequisites: Node 20+, PostgreSQL 14+ (or Docker), Android Studio with an emulator (or a device), JDK 17+.

### 1. Database

Use an existing PostgreSQL, or start one with Docker:

```bash
docker compose up -d postgres
```

Create the database (skip if using the Docker one, which creates `wide_impact` automatically):

```bash
createdb wide_impact
```

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`: set `DATABASE_URL`, a random `JWT_ACCESS_SECRET` (≥ 32 chars), and `ENABLE_DEV_LOGIN=true` to use the test accounts. Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Then:

```bash
npm install
npm run migrate
npm run seed
npm run dev
```

The API listens on `http://localhost:4000` (`GET /health` to check). `npm run seed` prints the sample classroom's join code.

Run the tests (they use a separate `wide_impact_test` database — create it first with `createdb wide_impact_test`):

```bash
npm test
```

### 3. Mobile app

> Google Sign-In is a native module, so the app runs in a **development build or the APK — not in Expo Go**.

```bash
cd mobile
cp .env.example .env
npm install
npx expo run:android
```

`.env` defaults point the Android emulator at the local backend (`http://10.0.2.2:4000`). For a physical device use your machine's LAN IP; for the iOS simulator use `http://localhost:4000` and `npx expo run:ios`.

To run the **Android emulator and the iOS simulator at the same time** against one local backend (e.g. a teacher on one, a student on the other), set `EXPO_PUBLIC_API_URL=http://localhost:4000` and forward the emulator's ports to your machine:

```bash
adb reverse tcp:4000 tcp:4000 && adb reverse tcp:8081 tcp:8081
```

To use the deployed API instead of a local one, set `EXPO_PUBLIC_API_URL=https://wide-impact-classroom-api.onrender.com` and restart Metro with `npx expo start --clear`.

If `pod install` fails with an encoding error on macOS, run it with `LANG=en_US.UTF-8`.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `DATABASE_SSL` | no (false) | `true` for hosted Postgres such as Neon |
| `JWT_ACCESS_SECRET` | yes | HMAC secret for access tokens, ≥ 32 chars |
| `JWT_ACCESS_TTL` | no (15m) | Access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | no (30) | Refresh token lifetime |
| `GOOGLE_CLIENT_IDS` | for Google login | Comma-separated OAuth client IDs accepted as ID-token audience (the **Web** client ID at minimum) |
| `ENABLE_DEV_LOGIN` | no (false) | Enables `POST /auth/dev-login` for test accounts |
| `CORS_ORIGINS` | no (*) | Allowed origins |
| `TRUST_PROXY` | no (0) | Proxy hops to trust for client IP (`1` behind Render) |
| `PORT`, `LOG_LEVEL`, `NODE_ENV` | no | Usual meaning |

### Mobile (`mobile/.env`, values are baked into the bundle at build time)

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL without `/api/v1` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth **Web** client ID (needed on Android to get an ID token). Empty → Google button disabled with a hint |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS client ID (iOS only, optional) |
| `EXPO_PUBLIC_ENABLE_DEV_LOGIN` | `true` shows one-tap test accounts on the sign-in screen |

## Google Sign-In setup

1. In Google Cloud Console, configure the OAuth consent screen (External, add test users if in testing mode).
2. Create an OAuth client of type **Web application** → put its ID in backend `GOOGLE_CLIENT_IDS` and mobile `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
3. Create an OAuth client of type **Android**: package `com.wideimpact.classroom`, SHA-1 of the signing key (debug: `keytool -list -v -keystore mobile/android/app/debug.keystore -storepass android`; EAS: `npx eas-cli credentials`).
4. (iOS) Create an **iOS** client for bundle `com.wideimpact.classroom`, set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and add it to `GOOGLE_CLIENT_IDS`. Then regenerate the iOS project (`npx expo prebuild -p ios`) so the Google URL scheme is added to `Info.plist`.

All clients must be in the **same** Google Cloud project. New clients can take a few minutes to start working.

The published APK and the deployed API are already configured with these clients. While the OAuth app is in **Testing** mode, *Continue with Google* only accepts Google accounts listed as test users (Google Cloud → *Audience → Test users*); everyone else can use the test accounts below.

## Test accounts

Reviewers can use one-tap test accounts (shown on the sign-in screen when `EXPO_PUBLIC_ENABLE_DEV_LOGIN=true` and backend `ENABLE_DEV_LOGIN=true`). They are created by `npm run seed`:

| Email | Role | Notes |
|---|---|---|
| `teacher@test.com` | Teacher (Ms. Rivera) | Owns **Mathematics 101** (join code on the live API: `033370`; a local seed prints its own random code) |
| `student1@test.com` | Student (Alex Kim) | Already enrolled in Mathematics 101 |
| `student2@test.com` | Student (Sara Ali) | Not enrolled — use this one to test joining |

The sign-in screen also accepts any custom email for a fresh account (you then pick a role). Dev login exists **only** because reviewers cannot sign in as our Google accounts; it is controlled by a flag and should be off in production.

## Testing QR code and numeric code onboarding

**Numeric code**
1. Sign in as `teacher@test.com` → open *Mathematics 101* → note the 6-digit code (or create a new classroom).
2. Sign out (profile icon → Sign out) and sign in as `student2@test.com`.
3. *Join a class* → *Enter code* → type the 6 digits → confirm on the preview screen.
4. The class appears in the student's list. Sign back in as the teacher: the student is listed with "via code".

**QR code** (needs two screens: two devices, or a device + the QR shown on a computer)
1. As the teacher, open the classroom — the QR code is on the detail screen.
2. As a student on another device, *Join a class* → *Scan QR code* → allow camera → point at the QR → confirm.
3. On the emulator you can point the virtual camera at a QR, or test the same flow via deep link:
   ```bash
   adb shell am start -W -a android.intent.action.VIEW -d "wideimpactclassroom://join?code=<CODE>" com.wideimpact.classroom
   ```
   Scanning the QR with the phone's own camera app also opens this deep link.

**Edge cases worth trying**: wrong code (→ "No classroom found with that code"), joining twice (→ "already in this class"), regenerating the code then using the old one (→ invalid), teacher removing a student, denying camera permission (→ explanation + "Open settings").

## Building the Android APK

With EAS (cloud build, requires a free Expo account):

```bash
cd mobile
npx eas-cli build -p android --profile preview
```

Or locally:

```bash
cd mobile
npx expo prebuild --platform android
cd android && ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew assembleRelease
```

The local APK is written to `android/app/build/outputs/apk/release/app-release.apk`. Set `mobile/.env` (especially `EXPO_PUBLIC_API_URL` pointing at the deployed backend) **before** building — the values are baked into the APK. The local release build is signed with the debug keystore, whose SHA-1 is the one registered for the Android Google client; an EAS build uses its own key, which needs its own Android client.

The APK is ~120 MB because it contains native code for all four CPU architectures. Add `-PreactNativeArchitectures=arm64-v8a` to build a much smaller APK for modern phones only.

## iOS

The codebase is cross-platform and iOS config is in `app.config.ts` (bundle id, camera permission string, Google Sign-In plugin activated when `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is set). Run on the simulator with `npx expo run:ios` (macOS + Xcode), or build with `npx eas-cli build -p ios --profile preview` (requires an Apple developer account). No iOS binary is included in this submission.

## Deployment (backend)

The live API runs on **Render** (free web service, Docker, Frankfurt) against a **Neon** PostgreSQL database (free tier, Frankfurt). Render redeploys automatically on every push to `main`, and the container runs migrations on start.

To deploy your own copy:

1. Create a Neon project and copy its **pooled** connection string. Use `sslmode=verify-full`; `channel_binding` is not needed.
2. Run the migrations and seed once from your machine:
   ```bash
   cd backend
   DATABASE_URL='<neon url>' DATABASE_SSL=true npm run migrate
   DATABASE_URL='<neon url>' DATABASE_SSL=true npm run seed
   ```
3. In Render, create a **Web Service** from this repo with root directory `backend`, runtime Docker, health check path `/health`, and the environment variables from `backend/.env.example`. Use `TRUST_PROXY=1` and `DATABASE_SSL=true`, and generate `JWT_ACCESS_SECRET` with Render's *Generate* button. `backend/render.yaml` describes the same setup as a Blueprint.

Free Render instances sleep when idle — the first request after a pause can take ~30–50 s.

## Known limitations

- **Google Sign-In** is limited to the OAuth app's test users while it is in Testing mode; everyone else can use the test accounts. Builds without the OAuth client IDs disable the Google button and work fully through the test-account login.
- The free Render server sleeps when idle, so the first request after a pause is slow (~30–50 s).
- No iOS build is shipped (iOS is supported by the code; see above).
- No real-time updates: the teacher's student list refreshes on focus / pull-to-refresh, not via websockets.
- Student lists are not paginated (fine for classroom-sized groups).
- Users cannot change role after choosing it, and there is no account deletion screen.
- See [docs/APPROACH.md](docs/APPROACH.md) for what I'd add with more time.

## Further documentation

- [docs/API.md](docs/API.md) — API reference
- [docs/APPROACH.md](docs/APPROACH.md) — development approach and architecture
- [docs/AI_DISCLOSURE.md](docs/AI_DISCLOSURE.md) — AI tool usage
