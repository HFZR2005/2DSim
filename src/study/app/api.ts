import type { Confidence } from '../signal';

export type StudentSummary = {
  id: string;
  display_name: string;
  created_at: string;
  sessionCount: number;
  testCount: number;
  averageSignal: number | null;
  lastStudied: string | null;
};

export type SessionRecord = {
  id: string;
  student_id: string;
  subject: string;
  topic: string;
  score: string | null;
  confidence: string | null;
  note: string | null;
  created_at: string;
  signal: number;
};

export type TopicStat = {
  name: string;
  count: number;
  averageSignal: number;
  trend: 'up' | 'down' | 'flat';
  lastStudied: string;
};

export type SubjectStat = {
  subject: string;
  count: number;
  averageSignal: number;
  topics: TopicStat[];
  tracks: TopicStat[];
};

export type TestRecord = {
  id: string;
  student_id: string;
  subject: string;
  track: string;
  title: string;
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
    score?: string;
    confidence?: Confidence;
    note?: string;
  },
) {
  return request<{ test: TestRecord }>(`/api/study/students/${studentId}/tests`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function logout() {
  return request<{ ok: boolean }>('/api/study/logout', { method: 'POST' });
}
