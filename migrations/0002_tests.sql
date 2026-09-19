CREATE TABLE tests (
  id TEXT PRIMARY KEY NOT NULL,
  student_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  track TEXT NOT NULL,
  title TEXT NOT NULL,
  score TEXT,
  confidence TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX tests_student_created_idx
  ON tests (student_id, created_at DESC);

CREATE INDEX tests_student_subject_track_idx
  ON tests (student_id, subject, track);
