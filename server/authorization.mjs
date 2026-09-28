export const USER_ROLES = ['student', 'parent', 'staff', 'admin'];

export const ORDER_READ_ROLES = new Set(['student', 'staff', 'admin']);
export const ORDER_CREATE_ROLES = new Set(['student']);

export function isUserRole(role) {
  return typeof role === 'string' && USER_ROLES.includes(role);
}

export function canReadOrders(role) {
  return ORDER_READ_ROLES.has(role);
}

export function canCreateOrders(role) {
  return ORDER_CREATE_ROLES.has(role);
}

export function assertRole(role, allowedRoles) {
  if (!allowedRoles.includes(role)) {
    const error = new Error('forbidden');
    error.statusCode = 403;
    throw error;
  }
}
