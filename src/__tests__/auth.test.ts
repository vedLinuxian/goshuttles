import { describe, it, expect, vi, beforeEach } from 'vitest';
import { middleware, config } from '../middleware';
import { NextRequest } from 'next/server';
import { login } from '../app/login/actions';
import { register } from '../app/register/actions';
import { db } from '../lib/db';
import * as authExports from '../lib/auth';

vi.mock('../lib/db', () => ({
  db: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    account: { findFirst: vi.fn(), create: vi.fn() }
  }
}));

vi.mock('../lib/auth', () => ({
  auth: { api: { signInEmail: vi.fn() } },
  applySetCookies: vi.fn(),
  getPasswordContext: vi.fn(() => Promise.resolve({
    password: { hash: vi.fn((p: string) => `hashed_${p}`) }
  }))
}));

vi.mock('bcryptjs', () => ({ compare: vi.fn(), hash: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/headers', () => ({ headers: vi.fn(() => Promise.resolve(new Headers())) }));

describe('Authentication & Authorization Tests (Post-Fix)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('Middleware & Route Protection', () => {
    it('FIX BUG-036: Middleware matcher regex no longer has trailing parenthesis', () => {
      const matcher = config.matcher[0];
      expect(matcher).toBe('/((?!_next/static|_next/image|favicon.ico).*)');
      expect(matcher).not.toContain('))');
    });

    it('FIX: Drivers are redirected from passenger routes', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: { id: '1', role: 'DRIVER', isActive: true } })
      });
      const req = new NextRequest('http://localhost/passenger/dashboard');
      const res = await middleware(req);
      expect(res.status).toBe(307);
    });
  });

  describe('Login Flow', () => {
    it('FIX BUG-016: External callbackUrl is rejected, redirects to role dashboard', async () => {
      const { redirect } = await import('next/navigation');
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: '1', email: 'test@test.com', isActive: true, role: 'CUSTOMER', passwordHash: null
      } as any);
      vi.mocked(db.account.findFirst).mockResolvedValue({ id: '1' } as any);
      vi.mocked(authExports.auth.api.signInEmail).mockResolvedValue({
        response: { token: '123', user: { id: '1' } },
        headers: { getSetCookie: () => [] }
      } as any);

      const formData = new FormData();
      formData.append('credential', 'test@test.com');
      formData.append('password', 'password123');
      formData.append('role', 'CUSTOMER');
      formData.append('callbackUrl', 'http://evil.com/phishing');

      await login(null, formData);

      expect(redirect).not.toHaveBeenCalledWith('http://evil.com/phishing');
      expect(redirect).toHaveBeenCalledWith('/passenger/dashboard');
    });

    it('FIX BUG-038: Generic error for unknown user (no enumeration)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);
      const formData = new FormData();
      formData.append('credential', 'ghost@test.com');
      formData.append('password', 'whatever');
      const result = await login(null, formData);
      expect(result).toEqual({ error: 'Invalid credentials. Please check your details and try again.' });
    });
  });

  describe('Register Flow', () => {
    it('FIX: Phone-only registration still succeeds (user created without email)', async () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('phone', '9876543210');
      formData.append('password', 'password123');
      formData.append('role', 'CUSTOMER');
      vi.mocked(db.user.findUnique).mockResolvedValue(null);
      const result = await register(null, formData);
      expect(result).toEqual({ success: 'Account created! Please sign in.' });
    });
  });
});
