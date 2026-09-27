import { createHash, randomBytes } from 'node:crypto';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: false } });

const hash = (value) => createHash('sha256').update(value, 'utf8').digest('hex');

export async function login(email, passwordHash, metadata = {}) {
  if (!email || !passwordHash) throw new Error('credentials_required');
  const client = await pool.connect();
  try {
    const user = await client.query(
      'SELECT id, email, role, active, password_hash FROM quickbite.users WHERE lower(email)=lower($1) LIMIT 1',
      [email.trim()],
    );
    if (!user.rowCount || !user.rows[0].active || user.rows[0].password_hash !== passwordHash) {
      throw new Error('invalid_credentials');
    }
    const token = randomBytes(32).toString('base64url');
    await client.query(
      'INSERT INTO quickbite.auth_sessions (user_id, token_hash, expires_at, user_agent, ip_address) VALUES ($1,$2,now()+interval \\'7 days\\',$3,$4)',
      [user.rows[0].id, hash(token), metadata.userAgent ?? null, metadata.ipAddress ?? null],
    );
    return { accessToken: token, user: { id: user.rows[0].id, email: user.rows[0].email, role: user.rows[0].role } };
  } finally { client.release(); }
}

export async function logout(sessionId, userId) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT quickbite.revoke_auth_session($1,$2) AS revoked', [sessionId, userId]);
    return Boolean(result.rows[0]?.revoked);
  } finally { client.release(); }
}
