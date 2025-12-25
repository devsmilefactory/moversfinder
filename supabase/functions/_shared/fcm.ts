/**
 * Firebase Cloud Messaging (FCM) HTTP v1 helper for Supabase Edge Functions (Deno)
 *
 * Legacy FCM API (`https://fcm.googleapis.com/fcm/send`) is deprecated by Google.
 * This helper uses OAuth2 service account auth and the HTTP v1 endpoint.
 *
 * Required env (Supabase secrets):
 * - FIREBASE_SERVICE_ACCOUNT_JSON: full service account JSON (stringified)
 *   OR FIREBASE_SERVICE_ACCOUNT: same, kept for backward compatibility with naming
 *
 * Optional env:
 * - FIREBASE_PROJECT_ID: overrides project_id from the service account JSON
 */

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string; // PEM
};

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

function base64UrlEncode(data: Uint8Array): string {
  let str = '';
  for (let i = 0; i < data.length; i++) str += String.fromCharCode(data[i]);
  // btoa expects binary string
  const b64 = btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncodeJson(obj: unknown): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  return base64UrlEncode(bytes);
}

function pemToPkcs8Bytes(pem: string): Uint8Array {
  const cleaned = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\r?\n|\r/g, '')
    .trim();
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importPrivateKey(serviceAccount: ServiceAccount): Promise<CryptoKey> {
  const keyData = pemToPkcs8Bytes(serviceAccount.private_key);
  return await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

async function signJwt(serviceAccount: ServiceAccount): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: serviceAccount.client_email,
    scope: FCM_SCOPE,
    aud: TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 55 * 60, // 55 minutes
  };

  const signingInput = `${base64UrlEncodeJson(header)}.${base64UrlEncodeJson(claim)}`;
  const key = await importPrivateKey(serviceAccount);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

function getServiceAccountFromEnv(): ServiceAccount | null {
  const raw =
    Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON') ||
    Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ||
    '';
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON (must be JSON string):', e);
    return null;
  }
}

export function isFcmV1Configured(): boolean {
  return Boolean(getServiceAccountFromEnv());
}

export function getFirebaseProjectId(): string | null {
  const sa = getServiceAccountFromEnv();
  if (!sa?.project_id) return null;
  return Deno.env.get('FIREBASE_PROJECT_ID') || sa.project_id;
}

export async function getFirebaseAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAtMs - 60_000 > now) {
    return cachedAccessToken.token;
  }

  const serviceAccount = getServiceAccountFromEnv();
  if (!serviceAccount) {
    throw new Error(
      'FCM v1 not configured: set FIREBASE_SERVICE_ACCOUNT_JSON (service account JSON string)'
    );
  }

  const assertion = await signJwt(serviceAccount);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get Firebase access token: ${res.status} ${text}`);
  }

  const json = await res.json();
  const accessToken = json.access_token as string;
  const expiresIn = Number(json.expires_in || 3600);
  cachedAccessToken = {
    token: accessToken,
    expiresAtMs: now + expiresIn * 1000,
  };

  return accessToken;
}

function stringifyData(data?: Record<string, unknown>): Record<string, string> | undefined {
  if (!data) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
}

export type FcmV1Message = {
  token: string;
  notification?: { title?: string; body?: string };
  data?: Record<string, unknown>;
  webpush?: {
    headers?: Record<string, string>;
    notification?: Record<string, unknown>;
    fcm_options?: Record<string, unknown>;
  };
  android?: Record<string, unknown>;
  apns?: Record<string, unknown>;
};

export async function sendFcmV1(message: FcmV1Message): Promise<any> {
  const projectId = getFirebaseProjectId();
  if (!projectId) throw new Error('Missing Firebase project_id (service account JSON)');

  const accessToken = await getFirebaseAccessToken();

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const body = {
    message: {
      token: message.token,
      ...(message.notification ? { notification: message.notification } : {}),
      ...(message.data ? { data: stringifyData(message.data) } : {}),
      ...(message.webpush ? { webpush: message.webpush } : {}),
      ...(message.android ? { android: message.android } : {}),
      ...(message.apns ? { apns: message.apns } : {}),
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }

  if (!res.ok) {
    throw new Error(`FCM v1 send failed: ${res.status} ${text}`);
  }

  return json;
}


