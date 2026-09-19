export type StaffViewer = {
  role: 'staff';
};

export type StudentViewer = {
  role: 'student';
  studentId: string;
};

export type Viewer = StaffViewer | StudentViewer;

export function canAccessStudent(viewer: Viewer, studentId: string): boolean {
  return viewer.role === 'staff' || viewer.studentId === studentId;
}

export function canManageStudents(viewer: Viewer): boolean {
  return viewer.role === 'staff';
}
