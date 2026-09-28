import { describe, expect, it } from 'vitest';
import { canCreateOrders, canReadOrders, isUserRole } from './authorization.mjs';

describe('QuickBite Core role authorization', () => {
  it('recognizes only the four supported roles', () => {
    expect(['student', 'parent', 'staff', 'admin'].every(isUserRole)).toBe(true);
    expect(isUserRole('both')).toBe(false);
    expect(isUserRole('student_parent')).toBe(false);
  });

  it('allows students and parents to create orders', () => {
    expect(canCreateOrders('student')).toBe(true);
    expect(canCreateOrders('parent')).toBe(true);
    expect(canCreateOrders('staff')).toBe(false);
    expect(canCreateOrders('admin')).toBe(false);
  });

  it('allows all supported roles to read orders, with resource filtering enforced separately', () => {
    expect(canReadOrders('student')).toBe(true);
    expect(canReadOrders('parent')).toBe(true);
    expect(canReadOrders('staff')).toBe(true);
    expect(canReadOrders('admin')).toBe(true);
  });
});
