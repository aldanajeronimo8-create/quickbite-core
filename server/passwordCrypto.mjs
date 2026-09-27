import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export function hashToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8) throw new Error('password_too_short');
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return ['scrypt', '16384', '8', '1', salt.toString('base64url'), Buffer.from(derived).toString('base64url')].join('$');
}

export async function verifyPassword(password, storedHash) {
  try {
    const [algorithm, n, r, p, saltText, digestText] = String(storedHash).split('$');
    if (algorithm !== 'scrypt' || !n || !r || !p || !saltText || !digestText) return false;
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(digestText, 'base64url');
    const actual = Buffer.from(await scrypt(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p) }));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url');
}
