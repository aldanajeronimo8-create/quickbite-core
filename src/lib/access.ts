export type UserRole = 'admin' | 'student' | 'parent' | 'staff';

export function canAccessAdmin(role: UserRole) {
  return role === 'admin';
}

export function canAccessStudent(role: UserRole) {
  return role === 'student' || role === 'admin' || role === 'staff';
}

export function canAccessParent(role: UserRole) {
  return role === 'parent';
}
