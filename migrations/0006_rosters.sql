CREATE TABLE user_roles (
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('learner', 'supervisor')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, role),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE rosters (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE INDEX rosters_owner_idx ON rosters (owner_user_id);

CREATE TABLE roster_members (
  roster_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (roster_id, student_id),
  FOREIGN KEY (roster_id) REFERENCES rosters(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX roster_members_student_idx ON roster_members (student_id);

CREATE TABLE student_shares (
  id TEXT PRIMARY KEY NOT NULL,
  student_id TEXT NOT NULL,
  email TEXT NOT NULL,
  user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX student_shares_student_email_idx
  ON student_shares (student_id, email);

CREATE INDEX student_shares_email_idx ON student_shares (email);
