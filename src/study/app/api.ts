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

export function createStudent(displayName: string) {
  return request<{ student: { id: string; display_name: string } }>('/api/study/students', {
    method: 'POST',
    body: JSON.stringify({ displayName }),
  });
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
  | { role: 'staff'; userId?: string }
  | { role: 'supervisor'; userId: string; studentId?: string; studentIds: string[]; writableIds: string[] }
  | { role: 'student'; userId: string; studentId: string }
  | { role: 'viewer'; userId: string; studentIds: string[] }
  | { role: 'pending'; userId: string };

export type AccessRecord = {
  id: string;
  email: string;
  student_id: string | null;
  kind: 'staff' | 'adult' | 'self';
};

export type RosterMember = {
  id: string;
  display_name: string;
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
  return request<{ viewer: ViewerInfo; email: string | null; displayName: string | null }>('/api/study/me');
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

export function fetchAccess(studentId: string) {
  return request<{ access: AccessRecord[] }>(`/api/study/access?student=${encodeURIComponent(studentId)}`);
}

export function grantAccess(body: { email: string; kind: 'staff' | 'adult' | 'self'; studentId?: string }) {
  return request<{ access: AccessRecord }>('/api/study/access', {
    method: 'POST',
    body: JSON.stringify(body),
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
