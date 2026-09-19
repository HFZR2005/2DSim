export type StaffViewer = {
  role: 'staff';
  userId?: string;
};

export type AdultViewer = {
  role: 'adult';
  userId: string;
  studentIds: string[];
};

export type StudentViewer = {
  role: 'student';
  userId: string;
  studentId: string;
};

export type PendingViewer = {
  role: 'pending';
  userId: string;
};

export type Viewer = StaffViewer | AdultViewer | StudentViewer | PendingViewer;

export function canAccessStudent(viewer: Viewer, studentId: string): boolean {
  if (viewer.role === 'staff') return true;
  if (viewer.role === 'student') return viewer.studentId === studentId;
  if (viewer.role === 'adult') return viewer.studentIds.includes(studentId);
  return false;
}

export function canManageStudents(viewer: Viewer): boolean {
  return viewer.role === 'staff';
}

export function visibleStudentIds(viewer: Viewer): string[] | null {
  if (viewer.role === 'staff') return null;
  if (viewer.role === 'student') return [viewer.studentId];
  if (viewer.role === 'adult') return viewer.studentIds;
  return [];
}
