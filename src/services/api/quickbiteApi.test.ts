import { describe, expect, it, vi } from 'vitest';
import { QuickBiteApi } from './quickbiteApi';

const session = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 1800, user: { id: 'u1', email: 'student@example.test', role: 'student' as const, roles: ['student'] as const, protected: false, fullName: 'Student' } };

describe('QuickBiteApi', () => {
  it('rotates the session once after an authenticated request receives 401', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'expired_token' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...session, accessToken: 'access-2', refreshToken: 'refresh-2' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const api = new QuickBiteApi('https://api.example.test', fetcher);
    api.setSession(session);
    await expect(api.orders()).resolves.toEqual({ items: [] });
    expect(fetcher).toHaveBeenNthCalledWith(2, 'https://api.example.test/v1/auth/refresh', expect.objectContaining({ method: 'POST' }));
    expect(api.getSession()?.refreshToken).toBe('refresh-2');
  });

  it('does not send a request with a missing API base URL', () => {
    expect(() => new QuickBiteApi('')).not.toThrow();
  });
});
