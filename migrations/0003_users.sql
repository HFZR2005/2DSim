CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  google_sub TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE user_access (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  email TEXT NOT NULL,
  student_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('staff', 'adult', 'self')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE UNIQUE INDEX user_access_email_scope_idx
  ON user_access (email, COALESCE(student_id, ''), kind);

CREATE INDEX user_access_user_idx
  ON user_access (user_id);

CREATE INDEX user_access_student_idx
  ON user_access (student_id);
