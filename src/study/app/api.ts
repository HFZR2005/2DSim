import type { Confidence } from '../signal';

export type StudentSummary = {
  id: string;
  display_name: string;
  created_at: string;
  sessionCount: number;
  testCount: number;
  averageSignal: number | null;
  lastStudied: string | null;
  hasCalendar: boolean;
  picture: string | null;
};

export type CalendarEvent = {
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
};

export type CalendarFeed = {
  connected: boolean;
  canEdit: boolean;
  source: 'url' | 'file' | null;
  feedUrl: string | null;
  events: CalendarEvent[];
  error: string | null;
};

export type SessionRecord = {
  id: string;
  student_id: string;
  subject: string;
  topic: string;
  type: string;
  score: string | null;
  confidence: string | null;
  note: string | null;
  created_at: string;
  signal: number;
};

export type TopicStat = {
  name: string;
  count: number;
  averageSignal: number | null;
  trend: 'up' | 'down' | 'flat';
  lastStudied: string;
};

export type SubjectStat = {
  subject: string;
  count: number;
  averageSignal: number | null;
  topics: TopicStat[];
  tracks: TopicStat[];
};

export type TestRecord = {
  id: string;
  student_id: string;
  subject: string;
  track: string;
  title: string;
  type: string;
  score: string | null;
  confidence: string | null;
  note: string | null;
  created_at: string;
  signal: number;
};

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.assign('/login');
    throw new Error('Sign in required');
  }
  if (!response.ok) {
    throw new Error(body.error ?? 'Request failed');
  }
  return body as T;
}

export function fetchStudents() {
  return request<{ students: StudentSummary[] }>('/api/study/students');
}

export function fetchSessions(studentId?: string, subject?: string) {
  const params = new URLSearchParams();
  if (studentId) params.set('student', studentId);
  if (subject) params.set('subject', subject);
  const query = params.toString();
  return request<{ sessions: SessionRecord[]; subjects: string[] }>(
    `/api/study/sessions${query ? `?${query}` : ''}`,
  );
}

export function fetchTopics(studentId: string, subject?: string) {
  const params = new URLSearchParams({ student: studentId });
  if (subject) params.set('subject', subject);
  return request<{ subjects: SubjectStat[] }>(`/api/study/topics?${params}`);
}

export function createSession(
  studentId: string,
  body: {
    subject: string;
    topic: string;
    type?: string;
    score?: string;
    confidence?: Confidence;
    note?: string;
  },
) {
  return request<{ session: SessionRecord }>(`/api/study/students/${studentId}/sessions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchTests(studentId?: string, subject?: string) {
  const params = new URLSearchParams();
  if (studentId) params.set('student', studentId);
  if (subject) params.set('subject', subject);
  const query = params.toString();
  return request<{ tests: TestRecord[] }>(`/api/study/tests${query ? `?${query}` : ''}`);
}

export function createTest(
  studentId: string,
  body: {
    subject: string;
    track: string;
    title: string;
    type?: string;
    score: string;
    note?: string;
  },
) {
  return request<{ test: TestRecord }>(`/api/study/students/${studentId}/tests`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateSessionNote(studentId: string, sessionId: string, note: string) {
  return request<{ session: SessionRecord }>(`/api/study/students/${studentId}/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });
}

export function updateTestNote(studentId: string, testId: string, note: string) {
  return request<{ test: TestRecord }>(`/api/study/students/${studentId}/tests/${testId}`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });
}

export function deleteSession(studentId: string, sessionId: string) {
  return request<{ ok: boolean }>(`/api/study/students/${studentId}/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

export function deleteTest(studentId: string, testId: string) {
  return request<{ ok: boolean }>(`/api/study/students/${studentId}/tests/${testId}`, {
    method: 'DELETE',
  });
}

export async function uploadNoteImage(studentId: string, blob: Blob): Promise<{ id: string }> {
  const response = await fetch(`/api/study/students/${studentId}/notes/images`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': blob.type || 'image/jpeg' },
    body: blob,
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.assign('/login');
    throw new Error('Sign in required');
  }
  if (!response.ok) {
    throw new Error(body.error ?? 'Could not upload image');
  }
  return body as { id: string };
}

export function deleteSubject(studentId: string, subject: string) {
  return request<{ ok: boolean; sessions: number; tests: number }>(
    `/api/study/students/${studentId}/subjects`,
    {
      method: 'DELETE',
      body: JSON.stringify({ subject }),
    },
  );
}

export type ViewerInfo =
  | { role: 'staff'; userId: string }
  | { role: 'supervisor'; userId: string; studentId?: string; studentIds: string[]; writableIds: string[] }
  | { role: 'student'; userId: string; studentId: string }
  | { role: 'viewer'; userId: string; studentIds: string[] }
  | { role: 'pending'; userId: string };

export type RosterMember = {
  id: string;
  display_name: string;
  picture: string | null;
};

export type OwnedRoster = {
  id: string;
  name: string;
  join_code: string;
  owner_email: string;
  members: RosterMember[];
};

export type JoinedRoster = {
  id: string;
  name: string;
  owner_email: string;
  members: RosterMember[];
};

export type ShareRecord = {
  id: string;
  student_id: string;
  email: string;
};

export function fetchMe() {
  return request<{ viewer: ViewerInfo; email: string | null; displayName: string | null; picture: string | null }>(
    '/api/study/me',
  );
}

export function chooseRole(role: 'learner' | 'supervisor') {
  return request<{ ok: boolean }>('/api/study/me/role', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
}

export function fetchRosters() {
  return request<{ owned: OwnedRoster[]; joined: JoinedRoster[] }>('/api/study/rosters');
}

export function createRoster(name: string) {
  return request<{ roster: { id: string; name: string; join_code: string } }>('/api/study/rosters', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function joinRoster(code: string) {
  return request<{ roster: { id: string; name: string } }>('/api/study/rosters/join', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function deleteRoster(rosterId: string) {
  return request<{ ok: boolean }>(`/api/study/rosters/${rosterId}`, { method: 'DELETE' });
}

export function addRosterMember(rosterId: string, email: string) {
  return request<{ ok: boolean }>(`/api/study/rosters/${rosterId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function removeRosterMember(rosterId: string, studentId: string) {
  return request<{ ok: boolean }>(`/api/study/rosters/${rosterId}/members`, {
    method: 'DELETE',
    body: JSON.stringify({ studentId }),
  });
}

export function fetchShares(studentId: string) {
  return request<{ shares: ShareRecord[] }>(`/api/study/students/${studentId}/shares`);
}

export function createShare(studentId: string, email: string) {
  return request<{ share: ShareRecord }>(`/api/study/students/${studentId}/shares`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function deleteShare(studentId: string, shareId: string) {
  return request<{ ok: boolean }>(`/api/study/students/${studentId}/shares/${shareId}`, {
    method: 'DELETE',
  });
}

export function logout() {
  return request<{ ok: boolean }>('/api/study/logout', { method: 'POST' });
}

export function fetchCalendar(studentId: string) {
  return request<CalendarFeed>(`/api/study/students/${studentId}/calendar`);
}

export function saveCalendarUrl(studentId: string, url: string | null) {
  return request<{ ok: boolean; source: 'url' | null }>(`/api/study/students/${studentId}/calendar`, {
    method: 'PUT',
    body: JSON.stringify({ url }),
  });
}

export const APPLICATION_STAGES = [
  'considering',
  'applied',
  'online_test',
  'interview',
  'final',
  'offer',
  'rejected',
  'withdrawn',
] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const APPLICATION_EVENT_TYPES = ['deadline', 'test_window', 'interview', 'other'] as const;
export type ApplicationEventType = (typeof APPLICATION_EVENT_TYPES)[number];

export type ApplicationEvent = {
  type: ApplicationEventType;
  at: string;
  ends_at?: string;
  label?: string;
};

export type ApplicationRecord = {
  id: string;
  student_id: string;
  company: string;
  role: string;
  stage: ApplicationStage;
  next_event: ApplicationEvent | null;
  url: string | null;
  notes: string;
  history: { at: string; stage: ApplicationStage; note: string }[];
  created_at: string;
  updated_at: string;
};

export function fetchApplications(studentId: string, includeClosed = false) {
  const params = new URLSearchParams();
  if (includeClosed) params.set('include_closed', '1');
  const query = params.toString();
  return request<{ applications: ApplicationRecord[] }>(
    `/api/study/students/${studentId}/applications${query ? `?${query}` : ''}`,
  );
}

export function createApplication(
  studentId: string,
  body: {
    company: string;
    role: string;
    stage?: ApplicationStage;
    next_event?: ApplicationEvent | null;
    url?: string | null;
    notes?: string;
  },
) {
  return request<{ application: ApplicationRecord }>(`/api/study/students/${studentId}/applications`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateApplication(
  studentId: string,
  applicationId: string,
  body: {
    stage?: ApplicationStage;
    next_event?: ApplicationEvent | null;
    url?: string | null;
    notes?: string;
    append_note?: string;
  },
) {
  return request<{ application: ApplicationRecord }>(
    `/api/study/students/${studentId}/applications/${applicationId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
}

export async function uploadCalendarIcs(studentId: string, file: File) {
  const response = await fetch(`/api/study/students/${studentId}/calendar`, {
    method: 'PUT',
    credentials: 'same-origin',
    body: (() => {
      const data = new FormData();
      data.append('ics', file);
      return data;
    })(),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.assign('/login');
    throw new Error('Sign in required');
  }
  if (!response.ok) {
    throw new Error(body.error ?? 'Could not upload calendar');
  }
  return body as { ok: boolean; source: 'file' };
}
