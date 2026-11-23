# Wide Impact Classroom — mobile

Expo (SDK 58) + React Native app for teachers and students. Teachers sign in with Google, create classrooms and share a QR code / 6-digit join code; students join by scanning the QR or typing the code. The API contract lives in [`../docs/API.md`](../docs/API.md).

## Stack

expo-router (typed routes) · TypeScript strict · @tanstack/react-query (server state) · zustand (session) · axios (with single-flight token refresh) · expo-secure-store (tokens) · expo-camera (QR scanning) · react-native-qrcode-svg · @react-native-google-signin/google-signin · zod.

## Run locally (Android emulator)

```bash
cp .env.example .env            # defaults point to http://10.0.2.2:4000 (host machine from the emulator)
npm install
npx expo run:android            # builds a dev build (native modules: Google Sign-In, camera, secure store)
```

The backend must be running on port 4000. With `EXPO_PUBLIC_ENABLE_DEV_LOGIN=true` (and `ENABLE_DEV_LOGIN=true` on the backend) the sign-in screen shows one-tap test accounts (`teacher@test.com`, `student1@test.com`, `student2@test.com`).

Test the deep link on the emulator:

```bash
adb shell am start -W -a android.intent.action.VIEW -d "wideimpactclassroom://join?code=123456" com.wideimpact.classroom
```

## Build an APK

```bash
npx eas-cli build -p android --profile preview      # cloud build, outputs an APK
# or locally:
npx expo prebuild --platform android && cd android && ./gradlew assembleRelease
```

`EXPO_PUBLIC_*` values are inlined at bundle time, so set them (in `.env` or the EAS profile `env`) before building.

### Google Sign-In

1. In Google Cloud, create a **Web** OAuth client (its ID goes into `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and the backend's `GOOGLE_CLIENT_IDS`).
2. Create an **Android** OAuth client for package `com.wideimpact.classroom` with the SHA-1 of the signing key (`cd android && ./gradlew signingReport`).
3. (iOS) create an iOS client and set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`; the URL scheme for the config plugin is derived from it.

Without a web client ID the Google button is disabled with a hint; dev login still works.

## Scripts

| Script | |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jest (jest-expo) unit tests |
| `npm run doctor` | `expo-doctor` |

## Structure

```
app/                     routes only (expo-router)
  _layout.tsx            providers, session bootstrap, Stack.Protected role guards
  index.tsx              redirect by session/role
  join.tsx               deep link handler (wideimpactclassroom://join?code=…)
  profile.tsx            user info + sign out
  (auth)/                sign-in, choose-role
  (teacher)/             classroom list, create, detail (QR, code, students), edit
  (student)/             my classes, join/scan, join/code, join/confirm, classroom detail
src/
  api/                   axios client (auth + refresh), typed endpoints, ApiError
  features/auth/         zustand store, SecureStore token storage, Google/dev login hooks
  features/classrooms/   react-query hooks, query keys, form schema
  features/join/         parseJoinPayload (+ tests)
  components/ui/         design-system primitives
  components/classroom/  ClassroomCard, JoinCodeCard, StudentRow, ClassroomForm
  theme/  config/  lib/  types/
```
