-- 001_init: users, refresh tokens, classrooms, enrollments.
-- gen_random_uuid() is built into PostgreSQL 13+.

CREATE TYPE user_role AS ENUM ('teacher', 'student');
CREATE TYPE join_method AS ENUM ('qr', 'code');

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub  text UNIQUE,
  email       text NOT NULL UNIQUE CHECK (email = lower(email)),
  full_name   text NOT NULL CHECK (length(btrim(full_name)) > 0),
  avatar_url  text,
  role        user_role,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE refresh_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,
  replaced_by  uuid REFERENCES refresh_tokens (id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);

CREATE TABLE classrooms (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id           uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name                 varchar(100) NOT NULL CHECK (length(btrim(name)) > 0),
  subject              varchar(100),
  description          varchar(500),
  join_code            char(6) NOT NULL CHECK (join_code ~ '^[0-9]{6}$'),
  join_code_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT classrooms_join_code_key UNIQUE (join_code)
);

CREATE INDEX classrooms_teacher_created_idx ON classrooms (teacher_id, created_at DESC);

CREATE TRIGGER classrooms_set_updated_at
  BEFORE UPDATE ON classrooms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE enrollments (
  classroom_id uuid NOT NULL REFERENCES classrooms (id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  joined_via   join_method NOT NULL,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (classroom_id, student_id)
);

CREATE INDEX enrollments_student_joined_idx ON enrollments (student_id, joined_at DESC);
