# Classroom API — v1

Base URL: `{API_URL}/api/v1` (local: `http://localhost:4000/api/v1`)
All bodies are JSON. All timestamps are ISO-8601 strings (UTC). All IDs are UUIDs.
Field naming in JSON is **camelCase**; the database uses snake_case.

## Authentication

- Login (`/auth/google` or `/auth/dev-login`) returns an **access token** (JWT, HS256, 15 min) and an opaque **refresh token** (random 48 bytes, base64url, 30 days, stored hashed with SHA-256 in `refresh_tokens`).
- Protected endpoints require `Authorization: Bearer <accessToken>`.
- Refresh tokens are **rotated** on every `/auth/refresh`. Re-using an already-rotated (revoked) refresh token is treated as theft: all of that user's refresh tokens are revoked and `401 REFRESH_TOKEN_REUSED` is returned.
- A refresh token revoked by `/auth/logout` returns `401 INVALID_REFRESH_TOKEN` (not a reuse event). Two *concurrent* refreshes with the same token count as reuse, so clients must single-flight their refresh calls.
- Malformed JSON bodies return `400 VALIDATION_ERROR` without `details`. Classroom `name`/`subject`/`description` are trimmed; an empty `subject`/`description` is stored as `null`.
- The JWT only carries `sub` (user id). The `authenticate` middleware loads the user row on every request, so role changes and deleted users take effect immediately.
- A user's `role` is `null` right after first login; they must choose it once via `PATCH /me/role`.

## Error format

Every non-2xx response has this shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human readable message", "details": [ { "path": "name", "message": "Required" } ] } }
```

`details` is optional (present for validation errors).

| HTTP | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body/params/query failed zod validation |
| 401 | `UNAUTHENTICATED` | Missing/invalid/expired access token, or user no longer exists |
| 401 | `INVALID_GOOGLE_TOKEN` | Google ID token failed verification or email not verified |
| 401 | `INVALID_REFRESH_TOKEN` | Unknown or expired refresh token |
| 401 | `REFRESH_TOKEN_REUSED` | Rotated refresh token was replayed (all sessions revoked) |
| 403 | `ROLE_REQUIRED` | User has not chosen a role yet |
| 403 | `FORBIDDEN` | Wrong role for this endpoint |
| 404 | `NOT_FOUND` | Route or resource not found (also used instead of 403 for classrooms the user can't access, to avoid leaking existence) |
| 404 | `INVALID_JOIN_CODE` | No classroom with that join code |
| 409 | `ROLE_ALREADY_SET` | `PATCH /me/role` when role is already set |
| 409 | `CONFLICT` | Unique-constraint conflict, e.g. Google login whose email already belongs to a *different* Google account |
| 413 | `PAYLOAD_TOO_LARGE` | Request body over 100 kb |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected error (no stack traces leaked) |

## Shared objects

**User**
```json
{ "id": "uuid", "email": "a@b.com", "fullName": "Jane Doe", "avatarUrl": "https://... | null", "role": "teacher | student | null", "createdAt": "..." }
```

**AuthResponse**
```json
{ "accessToken": "jwt", "refreshToken": "opaque", "user": User }
```

**TeacherClassroom** (returned to the owning teacher)
```json
{ "id": "uuid", "name": "Math 101", "subject": "Mathematics | null", "description": "... | null",
  "joinCode": "483920", "joinCodeUpdatedAt": "...", "studentCount": 12, "createdAt": "...", "updatedAt": "..." }
```

**StudentClassroom** (returned to an enrolled student — no join code)
```json
{ "id": "uuid", "name": "Math 101", "subject": "... | null", "description": "... | null",
  "teacher": { "id": "uuid", "fullName": "Mr. Smith", "avatarUrl": null },
  "studentCount": 12, "joinedAt": "...", "joinedVia": "qr | code", "createdAt": "..." }
```

**Student** (enrollment row as seen by the teacher)
```json
{ "id": "uuid", "fullName": "Sam", "email": "sam@x.com", "avatarUrl": null, "joinedAt": "...", "joinedVia": "qr | code" }
```

## QR code payload

The QR code shown by the teacher encodes: `wideimpactclassroom://join?code=483920`
The scanner must accept that URL **or** a bare 6-digit code. The join code is always exactly 6 digits (`^[0-9]{6}$`).

---

## Endpoints

### Health
`GET /health` (no `/api/v1` prefix, no auth) → `200 { "status": "ok", "db": "ok" }` or `503 { "status": "degraded", "db": "down" }`

### Auth (no access token required)

| Method | Path | Body | Success |
|---|---|---|---|
| POST | `/auth/google` | `{ "idToken": string }` | `200 AuthResponse` |
| POST | `/auth/dev-login` | `{ "email": string(email), "fullName"?: string(1..100) }` | `200 AuthResponse` — **only when `ENABLE_DEV_LOGIN=true`**, otherwise `404 NOT_FOUND` |
| POST | `/auth/refresh` | `{ "refreshToken": string }` | `200 AuthResponse` (new pair; old refresh token revoked) |
| POST | `/auth/logout` | `{ "refreshToken": string }` | `204` (idempotent) |

`/auth/google`: verifies the ID token with `google-auth-library` against `GOOGLE_CLIENT_IDS` (comma-separated, audience list). Requires `email_verified`. Upserts by `google_sub`; if no row has that sub but a row has the same email (e.g. seeded), it links the sub to that row.
`/auth/dev-login`: upserts a user by email (lowercased). Used for reviewer test accounts. Auth routes are rate limited per IP (30 / 15 min).

### Me (access token required)

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/me` | — | `200 { "user": User }` | 401 |
| PATCH | `/me/role` | `{ "role": "teacher" \| "student" }` | `200 { "user": User }` | 400, 401, 409 `ROLE_ALREADY_SET` |

### Classrooms (access token + role required)

| Method | Path | Role | Body / Query | Success | Notable errors |
|---|---|---|---|---|---|
| GET | `/classrooms` | any | — | teacher: `200 { "classrooms": TeacherClassroom[] }` (newest first); student: `200 { "classrooms": StudentClassroom[] }` (most recently joined first) | 403 `ROLE_REQUIRED` |
| POST | `/classrooms` | teacher | `{ "name": string(1..100, trimmed), "subject"?: string(≤100) \| null, "description"?: string(≤500) \| null }` | `201 { "classroom": TeacherClassroom }` | 400, 403 |
| GET | `/classrooms/lookup?code=123456` | student | — | `200 { "classroom": { "id", "name", "subject", "description", "teacher": {id, fullName, avatarUrl}, "studentCount", "isEnrolled": boolean } }` | 400, 404 `INVALID_JOIN_CODE`, 429 |
| POST | `/classrooms/join` | student | `{ "code": "123456", "method": "qr" \| "code" }` | `201 { "classroom": StudentClassroom, "alreadyEnrolled": false }` or `200 { ..., "alreadyEnrolled": true }` (idempotent) | 400, 404 `INVALID_JOIN_CODE`, 429 |
| GET | `/classrooms/:id` | owner teacher / enrolled student | — | teacher: `200 { "classroom": TeacherClassroom }`; student: `200 { "classroom": StudentClassroom }` | 404 |
| PATCH | `/classrooms/:id` | owner teacher | any subset of create body (at least one field) | `200 { "classroom": TeacherClassroom }` | 400, 404 |
| DELETE | `/classrooms/:id` | owner teacher | — | `204` (cascades enrollments) | 404 |
| POST | `/classrooms/:id/join-code` | owner teacher | — | `200 { "classroom": TeacherClassroom }` with a new code; the old code stops working immediately | 404 |
| GET | `/classrooms/:id/students` | owner teacher | — | `200 { "students": Student[] }` (newest first) | 404 |
| DELETE | `/classrooms/:id/students/:studentId` | owner teacher | — | `204` | 404 (classroom or enrollment) |
| POST | `/classrooms/:id/leave` | enrolled student | — | `204` | 404 |

`/classrooms/lookup` and `/classrooms/join` are rate limited **per user id** (20 / 15 min) to make join-code guessing impractical.
`:id` / `:studentId` must be UUIDs, otherwise `400 VALIDATION_ERROR`.
