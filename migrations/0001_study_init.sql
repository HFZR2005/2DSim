CREATE TABLE students (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL,
  student_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  score TEXT,
  confidence TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX sessions_student_created_idx
  ON sessions (student_id, created_at DESC);

CREATE INDEX sessions_student_subject_topic_idx
  ON sessions (student_id, subject, topic);
