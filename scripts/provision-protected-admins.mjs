import crypto from 'node:crypto';
import pg from 'pg';

const protectedAccounts = [
  ['useche.diego@maximino.edu.co', 'Diego Useche'],
  ['colmenares.juan@maximino.edu.co', 'Juan Colmenares'],
  ['aldana.jeronimo@maximino.edu.co', 'Jeronimo Aldana'],
  ['fernandez.gabriel@maximino.edu.co', 'Gabriel Fernandez'],
];

const databaseUrl = process.env.DATABASE_URL;
const password = process.env.PROTECTED_ADMIN_PASSWORD;

if (!databaseUrl) throw new Error('DATABASE_URL is required.');
if (!password || password.length < 6) throw new Error('PROTECTED_ADMIN_PASSWORD is required.');

function passwordHash(value) {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.scryptSync(value, salt, 64).toString('hex');
  return `${salt}:${digest}`;
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  await client.query('BEGIN');
  for (const [email, fullName] of protectedAccounts) {
    const existing = await client.query('SELECT id FROM quickbite.users WHERE email=$1 FOR UPDATE', [email]);
    let userId = existing.rows[0]?.id;
    if (userId) {
      await client.query(
        "UPDATE quickbite.users SET password_hash=$2, role='admin', active=true, updated_at=now() WHERE id=$1",
        [userId, passwordHash(password)],
      );
      await client.query('UPDATE quickbite.profiles SET full_name=$2 WHERE user_id=$1', [userId, fullName]);
    } else {
      const created = await client.query(
        "INSERT INTO quickbite.users(email,password_hash,role,active) VALUES($1,$2,'admin',true) RETURNING id",
        [email, passwordHash(password)],
      );
      userId = created.rows[0].id;
      await client.query('INSERT INTO quickbite.profiles(user_id,full_name) VALUES($1,$2)', [userId, fullName]);
    }
  }
  await client.query('COMMIT');
  console.log('Protected QuickBite accounts provisioned.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
