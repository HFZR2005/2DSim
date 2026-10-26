ALTER TABLE sessions ADD COLUMN item_ref TEXT;
ALTER TABLE sessions ADD COLUMN title TEXT;
ALTER TABLE sessions ADD COLUMN started_at TEXT;
ALTER TABLE sessions ADD COLUMN minutes INTEGER;
ALTER TABLE sessions ADD COLUMN progress REAL;
ALTER TABLE sessions ADD COLUMN fix_next TEXT;
ALTER TABLE sessions ADD COLUMN redo_after TEXT;
ALTER TABLE sessions ADD COLUMN review_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE sessions ADD COLUMN resolves_log_id TEXT;
ALTER TABLE sessions ADD COLUMN created_by TEXT NOT NULL DEFAULT 'user';
ALTER TABLE sessions ADD COLUMN updated_at TEXT;
ALTER TABLE sessions ADD COLUMN deleted_at TEXT;
ALTER TABLE sessions ADD COLUMN client_request_id TEXT;

ALTER TABLE tests ADD COLUMN item_ref TEXT;
ALTER TABLE tests ADD COLUMN started_at TEXT;
ALTER TABLE tests ADD COLUMN minutes INTEGER;
ALTER TABLE tests ADD COLUMN progress REAL;
ALTER TABLE tests ADD COLUMN fix_next TEXT;
ALTER TABLE tests ADD COLUMN redo_after TEXT;
ALTER TABLE tests ADD COLUMN review_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE tests ADD COLUMN resolves_log_id TEXT;
ALTER TABLE tests ADD COLUMN created_by TEXT NOT NULL DEFAULT 'user';
ALTER TABLE tests ADD COLUMN updated_at TEXT;
ALTER TABLE tests ADD COLUMN deleted_at TEXT;
ALTER TABLE tests ADD COLUMN client_request_id TEXT;

CREATE TABLE student_topics (
  student_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (student_id, subject, topic),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE mcp_applications (
  id TEXT PRIMARY KEY NOT NULL,
  student_id TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  stage TEXT NOT NULL,
  next_event TEXT,
  url TEXT,
  notes TEXT NOT NULL DEFAULT '',
  history TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX mcp_applications_student_idx ON mcp_applications (student_id, updated_at DESC);

CREATE TABLE mcp_idempotency (
  user_id TEXT NOT NULL,
  client_request_id TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, client_request_id)
);
