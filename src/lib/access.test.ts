import { describe, expect, it } from 'vitest';
import { canAccessAdmin, canAccessStudent } from './access';

describe('combined and administrative preview access', () => {
  it('keeps staff scoped to staff access and out of student/admin interfaces', () => {
    expect(canAccessAdmin('staff')).toBe(false);
    expect(canAccessStudent('staff')).toBe(false);
  });

  it('keeps normal single-role access scoped while allowing admin student preview', () => {
    expect(canAccessAdmin('student')).toBe(false);
    expect(canAccessStudent('admin')).toBe(true);
    expect(canAccessStudent('student')).toBe(true);
    expect(canAccessAdmin('parent')).toBe(false);
  });
});
