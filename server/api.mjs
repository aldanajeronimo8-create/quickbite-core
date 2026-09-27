import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { Pool } from 'pg';

const PORT = Number(process.env.API_PORT || 8787);
const HOST = process.env.API_HOST || '127.0.0.1';
const DATABASE_URL = process.env.DATABASE_URL;
const ALLOWED_ORIGIN = process.env.API_CORS_ORIGIN || 'http://localhost:5173';

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required. The frontend must never receive this value.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: false },
});

function hashToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function send(res, status, body, requestId) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Request-Id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'X-Request-Id': requestId,
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw.length > 1_000_000) throw Object.assign(new Error('payload_too_large'), { status: 413 });
  return JSON.parse(raw);
}

async function authenticate(req, client) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  const result = await client.query(
    `SELECT s.user_id, u.role, u.active
       FROM quickbite.auth_sessions s
       JOIN quickbite.users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND u.active = true
      LIMIT 1`,
    [hashToken(token)],
  );

  if (!result.rowCount) return null;

  await client.query(
    'UPDATE quickbite.auth_sessions SET last_used_at = now() WHERE token_hash = $1',
    [hashToken(token)],
  );

  return result.rows[0];
}

async function route(req, res) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  if (req.method === 'OPTIONS') return send(res, 204, null, requestId);

  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  const client = await pool.connect();

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      await client.query('SELECT 1');
      return send(res, 200, { ok: true, service: 'quickbite-api', requestId }, requestId);
    }

    if (req.method === 'GET' && url.pathname === '/v1/menu') {
      const result = await client.query(
        `SELECT * FROM quickbite.v_menu
          WHERE active = true
          ORDER BY category_name NULLS LAST, category_sort_order, product_sort_order, product_name`,
      );
      return send(res, 200, { data: result.rows, requestId }, requestId);
    }

    const actor = await authenticate(req, client);
    if (!actor) return send(res, 401, { error: 'unauthorized', requestId }, requestId);

    if (req.method === 'GET' && url.pathname === '/v1/me') {
      const result = await client.query(
        `SELECT u.id, u.email, u.role, u.active,
                p.full_name, p.student_code, p.section_id, p.grade_id, p.course_id
           FROM quickbite.users u
           LEFT JOIN quickbite.user_profiles p ON p.user_id = u.id
          WHERE u.id = $1`,
        [actor.user_id],
      );
      return send(res, 200, { data: result.rows[0], requestId }, requestId);
    }

    if (req.method === 'GET' && url.pathname === '/v1/orders') {
      const result = await client.query(
        `SELECT o.*, COALESCE(jsonb_agg(jsonb_build_object(
             'id', oi.id, 'product_id', oi.product_id,
             'product_name', oi.product_name_snapshot,
             'unit_price', oi.unit_price, 'quantity', oi.quantity,
             'line_total', oi.line_total
           ) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL), '[]'::jsonb) AS items
           FROM quickbite.orders o
           LEFT JOIN quickbite.order_items oi ON oi.order_id = o.id
          WHERE o.user_id = $1
          GROUP BY o.id
          ORDER BY o.created_at DESC
          LIMIT 100`,
        [actor.user_id],
      );
      return send(res, 200, { data: result.rows, requestId }, requestId);
    }

    if (req.method === 'POST' && url.pathname === '/v1/orders') {
      if (!['student', 'admin', 'staff'].includes(actor.role)) {
        return send(res, 403, { error: 'forbidden', requestId }, requestId);
      }

      const body = await readJson(req);
      if (!body.idempotencyKey || !Array.isArray(body.items)) {
        return send(res, 400, { error: 'invalid_order_payload', requestId }, requestId);
      }

      const result = await client.query(
        `SELECT * FROM quickbite.create_order_tx($1, $2, $3::jsonb, $4, $5)`,
        [
          actor.user_id,
          body.idempotencyKey,
          JSON.stringify(body.items),
          body.notes ?? null,
          body.paymentMethod ?? 'pending',
        ],
      );

      return send(res, 201, { data: result.rows[0], requestId }, requestId);
    }

    return send(res, 404, { error: 'not_found', requestId }, requestId);
  } catch (error) {
    const status = error?.status || (error?.code === '23505' ? 409 : 500);
    const safeMessage = status < 500 ? error.message : 'internal_server_error';
    return send(res, status, { error: safeMessage, requestId }, requestId);
  } finally {
    client.release();
  }
}

const server = createServer((req, res) => {
  route(req, res).catch(() => {
    const requestId = randomUUID();
    send(res, 500, { error: 'internal_server_error', requestId }, requestId);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`QuickBite API listening on http://${HOST}:${PORT}`);
});

process.on('SIGTERM', async () => {
  server.close();
  await pool.end();
});
