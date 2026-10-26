CREATE TABLE note_images (
  id TEXT PRIMARY KEY NOT NULL,
  student_id TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX note_images_student_idx ON note_images (student_id);
