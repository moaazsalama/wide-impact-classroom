# Development Approach

## 1. How I approached the task

1. **Read the brief for the core flows** — teacher signs in → creates classroom → shares QR / code → student joins — and for what is graded (architecture, API/DB design, auth & security, error handling, working app).
2. **Resolved the open questions up front** and wrote them down as assumptions (section 5), most importantly: *how does a student identify themself?*
3. **Contract first.** Before writing code I wrote [`API.md`](API.md): endpoints, payloads, the error format and error codes, auth rules, and the QR payload format. The backend and the mobile app were then built in parallel against that single contract, which kept the two halves consistent and made integration straightforward.
4. **Backend with tests**, then **mobile app**, then **integration on an Android emulator**, then **docs and APK**.

## 2. Architecture

```
┌──────────────────────── Mobile (Expo / React Native) ────────────────────────┐
│ app/ (expo-router routes, thin)                                              │
│   (auth)  sign-in, choose-role        (teacher) list, new, detail, edit       │
│   join (deep link)  profile           (student) list, scan, code, confirm,    │
│                                                 detail                       │
│ src/features/*  react-query hooks, zustand session store, join-payload parser │
│ src/api/*       axios client (Bearer + single-flight refresh), typed endpoints│
│ src/components  ui/ (Button, TextField, CodeInput, states…), classroom/       │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │ HTTPS · JSON · REST /api/v1 · Bearer JWT
┌──────────────────────────────▼──────────── Backend (Express 5) ──────────────┐
│ middleware: helmet, cors, pino-http, rate limiters, authenticate, requireRole │
│ modules/{auth,users,classrooms}: routes → controller (zod parse) → service    │
│                                   (rules, authorization) → repository (SQL)   │
│ errorHandler: ZodError/AppError/pg errors → { error: { code, message } }      │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │ node-postgres pool, parameterized SQL, transactions
┌──────────────────────────────▼──────────── PostgreSQL ───────────────────────┐
│ users ─1:N─ classrooms ─1:N─ enrollments ─N:1─ users        refresh_tokens    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Backend decisions
- **Layered modules** (`routes → controller → service → repository`). Controllers only parse/shape HTTP; services hold business rules and authorization; repositories are the only place with SQL and map `snake_case` rows to `camelCase` DTOs. Easy to test and to read.
- **Plain SQL + a tiny migration runner** instead of an ORM: the schema is small, and explicit SQL makes relationships, constraints and indexes obvious to a reviewer. Migrations run in transactions and are tracked in `schema_migrations`.
- **Database enforces invariants**, not just the app: `UNIQUE(join_code)`, `CHECK (join_code ~ '^[0-9]{6}$')`, composite PK `(classroom_id, student_id)` so a student can't be enrolled twice, `ON DELETE CASCADE` from classrooms to enrollments, lower-case email check, enums for role and join method.
- **zod everywhere at the boundary** (env vars validated at boot — the server refuses to start misconfigured; every request body/param/query validated).
- **`createApp(deps)`** lets tests inject config, a stub Google verifier and rate-limit settings. Tests run against a real Postgres (41 integration tests) because most bugs in this kind of app live in SQL and authorization, which mocks would hide.
- **Uniform error format** `{ error: { code, message, details? } }` with stable machine-readable codes the app maps to friendly messages. Unexpected errors are logged and returned as a generic 500 without stack traces.

### Auth & security
- The app gets a Google **ID token** natively and sends it to the backend, which verifies signature, audience (our client IDs) and `email_verified` with `google-auth-library`. The backend then issues **its own** tokens, so the API isn't coupled to Google sessions.
- **Access token**: JWT, 15 min, only `sub`. The user row is loaded on every request, so role changes and deleted users take effect immediately.
- **Refresh token**: random 48 bytes, stored only as a SHA-256 hash, **rotated on each use**; replaying a rotated token revokes all of that user's sessions (stolen-token detection). Logout revokes the token.
- On the device, tokens live in **expo-secure-store** (Keychain / Keystore). The axios client refreshes **single-flight** so concurrent 401s trigger one refresh (important, since concurrent refreshes with the same token would look like reuse).
- **Authorization**: a classroom the user can't access returns **404, not 403**, so IDs/existence don't leak. Teachers only ever see their own classrooms; students never receive the join code.
- **Join-code guessing**: 6 digits = 1,000,000 combinations, so lookup/join are **rate limited per user** (20 / 15 min) and auth endpoints per IP. Teachers can regenerate a leaked code instantly.
- helmet headers, 100 kb body limit, parameterized SQL only, secrets only in env (`.env.example` contains none).

### Mobile decisions
- **expo-router** with route groups `(auth)`, `(teacher)`, `(student)` and `Stack.Protected` guards driven by the session state, so a student can never navigate into teacher screens and vice versa. Routes are thin; logic lives in `src/features`.
- **State management split by kind of state**: server state in **react-query** (caching, refetch on focus, pull-to-refresh, targeted invalidation after mutations); the small amount of client/session state (user, auth status) in **zustand**. No global store full of copied server data.
- **QR content** is a deep link (`wideimpactclassroom://join?code=123456`) rather than a bare number: the in-app scanner accepts it, *and* a phone's native camera opens the app straight on the join screen. `parseJoinPayload` accepts either a URL or a bare code and is unit tested.
- **Two-step join** (lookup preview → confirm) so a student sees the class name and teacher before joining — avoids joining the wrong class from a mistyped code.
- Reusable UI kit (`Button`, `TextField`, `CodeInput`, `Screen`, `EmptyState`, `ErrorState`, `LoadingState`, …) and theme tokens; every data screen has loading / empty / error-with-retry states.

## 3. How frontend, backend and database communicate

1. App → `POST /api/v1/auth/google { idToken }` → backend verifies with Google → upserts `users` → returns `{ accessToken, refreshToken, user }` → app stores tokens in SecureStore.
2. First login: `user.role === null` → app shows role picker → `PATCH /me/role`.
3. Teacher: `POST /classrooms` → service generates a random 6-digit code (`crypto.randomInt`, retries on the unique constraint) → `INSERT classrooms` → app renders the code and a QR encoding the deep link.
4. Student scans/types → `GET /classrooms/lookup?code=` (preview) → `POST /classrooms/join { code, method }` → `INSERT enrollments … ON CONFLICT DO NOTHING` (idempotent: returns `alreadyEnrolled`) → app invalidates the classroom queries and navigates to the class.
5. Any request with an expired access token gets `401 UNAUTHENTICATED` → client calls `/auth/refresh` once → retries the original request.

## 4. Challenges and how I resolved them

- **Testing Google Sign-In without reviewers' Google accounts.** Reviewers can't log in as my Google user, and a Google OAuth app in testing mode only allows listed test users. I added a **dev-login** endpoint behind `ENABLE_DEV_LOGIN` plus seeded test accounts, shown in the app only when `EXPO_PUBLIC_ENABLE_DEV_LOGIN=true`. The real Google flow remains the primary path.
- **Refresh races.** Several screens fire requests at once; when the access token expires they'd all refresh simultaneously, and with rotation + reuse detection that would log the user out. Solved with a single-flight refresh promise in the axios interceptor.
- **Identical route names in two groups** (`(teacher)/classrooms/[id]` and `(student)/classrooms/[id]`) are ambiguous for expo-router; navigation always uses group-qualified paths.
- **Deep link before sign-in.** If a signed-out user opens a join link, the code is kept as a pending join and resumed after sign-in/role selection.
- **Reaching the backend from an installed APK.** `localhost` doesn't work on a device, so the API URL is a build-time env var and the backend ships with a Dockerfile + Render blueprint (Neon Postgres), running migrations on container start.

## 5. Assumptions and compromises

- **Students also sign in with Google** and choose the student role once. The brief only specifies Google auth for teachers; giving students accounts lets them see "my classrooms", prevents duplicate joins and lets teachers see who joined. A role is chosen once and can't be changed in-app.
- A student can join many classrooms; a classroom has exactly one teacher.
- Join codes are 6 digits (numeric keyboard friendly) and don't expire; teachers can rotate them.
- Dev/test login is a deliberate, flag-guarded compromise for reviewability.
- The JWT secret is symmetric (HS256) because one service both issues and verifies tokens.
- Loading the user on every request costs one indexed query; acceptable at this scale and it gives immediate revocation of role/user changes.

## 6. What I'd improve with more time

- Real-time roster updates (websocket / SSE) when a student joins.
- Code expiry / max-uses options, and a "pending approval" mode where the teacher approves joins.
- Pagination + search for students and classrooms; classroom archiving instead of hard delete.
- Account settings: change name, delete account (GDPR), switch role with safeguards.
- Mobile tests beyond the parser: component tests with React Native Testing Library and an E2E flow with Maestro; CI pipeline (typecheck, lint, tests, EAS build on tag).
- Observability: request IDs surfaced to the client, Sentry on both sides, metrics.
- OpenAPI spec generated from the zod schemas, and a typed client generated for the app.
- Offline-friendly join (queue the join and retry), localization (Arabic / RTL).
