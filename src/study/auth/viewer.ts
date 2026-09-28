export type StaffViewer = {
  role: 'staff';
  userId?: string;
};

export type SupervisorViewer = {
  role: 'supervisor';
  userId: string;
  studentId?: string;
  studentIds: string[];
  writableIds: string[];
};

export type StudentViewer = {
  role: 'student';
  userId: string;
  studentId: string;
};

export type GuestViewer = {
  role: 'viewer';
  userId: string;
  studentIds: string[];
};

export type PendingViewer = {
  role: 'pending';
  userId: string;
};

export type Viewer = StaffViewer | SupervisorViewer | StudentViewer | GuestViewer | PendingViewer;

export function canAccessStudent(viewer: Viewer, studentId: string): boolean {
  if (viewer.role === 'staff') return true;
  if (viewer.role === 'student') return viewer.studentId === studentId;
  if (viewer.role === 'supervisor') return viewer.studentIds.includes(studentId);
  if (viewer.role === 'viewer') return viewer.studentIds.includes(studentId);
  return false;
}

export function canWriteStudent(viewer: Viewer, studentId: string): boolean {
  if (viewer.role === 'staff') return true;
  if (viewer.role === 'student') return viewer.studentId === studentId;
  if (viewer.role === 'supervisor') return viewer.writableIds.includes(studentId);
  return false;
}

export function canManageStudents(viewer: Viewer): boolean {
  return viewer.role === 'staff';
}

export function canManageRosters(viewer: Viewer): boolean {
  return viewer.role === 'staff' || viewer.role === 'supervisor';
}

export function visibleStudentIds(viewer: Viewer): string[] | null {
  if (viewer.role === 'staff') return null;
  if (viewer.role === 'student') return [viewer.studentId];
  if (viewer.role === 'supervisor' || viewer.role === 'viewer') return viewer.studentIds;
  return [];
}

export function canSwitchStudents(viewer: Viewer): boolean {
  return viewer.role === 'staff' || viewer.role === 'supervisor' || viewer.role === 'viewer';
}
