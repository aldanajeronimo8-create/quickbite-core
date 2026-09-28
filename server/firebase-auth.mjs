import { createPublicKey, createVerify } from 'node:crypto';

let certificatesCache = { certificates: {}, expiresAt: 0 };

function decodeBase64Url(value) {
  return Buffer.from(String(value), 'base64url').toString('utf8');
}

async function getFirebaseCertificates() {
  if (Date.now() < certificatesCache.expiresAt && Object.keys(certificatesCache.certificates).length) {
    return certificatesCache.certificates;
  }

  const response = await globalThis.fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!response.ok) throw new Error('firebase_keys_unavailable');

  const certificates = await response.json();
  const maxAge = Number(
    response.headers.get('cache-control')?.match(/max-age=(\d+)/i)?.[1] ?? 3600
  );
  certificatesCache = {
    certificates,
    expiresAt: Date.now() + maxAge * 1000,
  };
  return certificates;
}

export async function verifyFirebaseGoogleIdToken(idToken) {
  const projectId = String(process.env.FIREBASE_PROJECT_ID ?? 'quickbite-daf31').trim();
  if (!projectId) throw new Error('firebase_not_configured');

  const parts = String(idToken ?? '').split('.');
  if (parts.length !== 3) throw new Error('invalid_firebase_token');

  let header;
  let payload;
  try {
    header = JSON.parse(decodeBase64Url(parts[0]));
    payload = JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    throw new Error('invalid_firebase_token');
  }

  if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
    throw new Error('invalid_firebase_token');
  }

  const certificates = await getFirebaseCertificates();
  const certificate = certificates[header.kid];
  if (typeof certificate !== 'string') throw new Error('invalid_firebase_token');

  const verifier = createVerify('RSA-SHA256');
  verifier.update(parts[0] + '.' + parts[1]);
  verifier.end();

  if (!verifier.verify(createPublicKey(certificate), Buffer.from(parts[2], 'base64url'))) {
    throw new Error('invalid_firebase_token');
  }

  const now = Math.floor(Date.now() / 1000);
  const issuer = 'https://securetoken.google.com/' + projectId;
  const signInProvider = payload.firebase?.sign_in_provider;

  if (
    payload.aud !== projectId ||
    payload.iss !== issuer ||
    typeof payload.sub !== 'string' ||
    payload.sub.length === 0 ||
    payload.sub.length > 128 ||
    !Number.isFinite(Number(payload.exp)) ||
    Number(payload.exp) <= now ||
    !Number.isFinite(Number(payload.iat)) ||
    Number(payload.iat) > now + 60 ||
    !Number.isFinite(Number(payload.auth_time)) ||
    Number(payload.auth_time) > now + 60 ||
    typeof payload.email !== 'string' ||
    payload.email.trim() === '' ||
    payload.email_verified !== true ||
    signInProvider !== 'google.com'
  ) {
    throw new Error('invalid_firebase_token');
  }

  return {
    uid: payload.sub,
    email: payload.email.trim().toLowerCase(),
    fullName: typeof payload.name === 'string' ? payload.name.trim() : '',
  };
}
