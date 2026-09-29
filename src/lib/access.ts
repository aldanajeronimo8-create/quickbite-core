export type UserRole = 'admin' | 'student' | 'parent' | 'staff';

/** Roles originales de QuickBite: estudiante, padre y administrador. Staff es el cuarto rol añadido. */
export const ORIGINAL_ROLES: UserRole[] = ['student', 'parent', 'admin'];
export const ALL_ROLES: UserRole[] = [...ORIGINAL_ROLES, 'staff'];

export function canAccessAdmin(role: UserRole) {
  return role === 'admin';
}

export function canAccessStudent(role: UserRole) {
  return role === 'student' || role === 'admin';
}

export function canAccessParent(role: UserRole) {
  return role === 'parent';
}

export function canAccessStaff(role: UserRole) {
  return role === 'staff';
}
