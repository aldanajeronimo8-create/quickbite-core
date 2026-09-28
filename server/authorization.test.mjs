import { describe, expect, it } from 'vitest';
import { canCreateOrders, canReadOrders, isUserRole } from './authorization.mjs';

describe('QuickBite Core role authorization', () => {
  it('recognizes only the four supported roles', () => {
    expect(['student', 'parent', 'staff', 'admin'].every(isUserRole)).toBe(true);
    expect(isUserRole('both')).toBe(false);
    expect(isUserRole('student_parent')).toBe(false);
  });

  it('keeps order creation restricted to students', () => {
    expect(canCreateOrders('student')).toBe(true);
    expect(canCreateOrders('parent')).toBe(false);
    expect(canCreateOrders('staff')).toBe(false);
    expect(canCreateOrders('admin')).toBe(false);
  });

  it('allows order visibility only to student, staff, and admin', () => {
    expect(canReadOrders('student')).toBe(true);
    expect(canReadOrders('parent')).toBe(false);
    expect(canReadOrders('staff')).toBe(true);
    expect(canReadOrders('admin')).toBe(true);
  });
});
