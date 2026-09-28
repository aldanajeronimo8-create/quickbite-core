import { describe, expect, it } from 'vitest';
import {
  canAdminister,
  canCreateOrders,
  canOperateOrders,
  canReadOrders,
  USER_ROLES,
} from '../../server/authorization.mjs';

describe('QuickBite four-role authorization', () => {
  it('keeps exactly the four supported roles', () => {
    expect(USER_ROLES).toEqual(['student', 'parent', 'staff', 'admin']);
  });

  it('allows Student and Parent to create orders', () => {
    expect(canCreateOrders('student')).toBe(true);
    expect(canCreateOrders('parent')).toBe(true);
    expect(canCreateOrders('staff')).toBe(false);
    expect(canCreateOrders('admin')).toBe(false);
  });

  it('allows every role to read only through its resource-specific policy', () => {
    expect(canReadOrders('student')).toBe(true);
    expect(canReadOrders('parent')).toBe(true);
    expect(canReadOrders('staff')).toBe(true);
    expect(canReadOrders('admin')).toBe(true);
  });

  it('limits operational order mutations to Staff and Admin', () => {
    expect(canOperateOrders('student')).toBe(false);
    expect(canOperateOrders('parent')).toBe(false);
    expect(canOperateOrders('staff')).toBe(true);
    expect(canOperateOrders('admin')).toBe(true);
  });

  it('limits administration to Admin', () => {
    expect(canAdminister('student')).toBe(false);
    expect(canAdminister('parent')).toBe(false);
    expect(canAdminister('staff')).toBe(false);
    expect(canAdminister('admin')).toBe(true);
  });
});
