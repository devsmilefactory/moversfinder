// Lightweight debug logger used during development.
// Disabled by default to avoid noisy network errors when no local ingest server is running.
//
// Enable via:
// - localStorage.setItem('AGENT_LOG_ENABLED', '1')
// or
// - VITE_AGENT_LOG_ENABLED=true (in your Vite env)
//
// Optional:
// - VITE_AGENT_LOG_URL=http://127.0.0.1:7242/ingest/<uuid>

const DEFAULT_INGEST_URL =
  'http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81';

const getIngestUrl = () => {
  try {
    return import.meta?.env?.VITE_AGENT_LOG_URL || DEFAULT_INGEST_URL;
  } catch {
    return DEFAULT_INGEST_URL;
  }
};

const isEnabled = () => {
  try {
    const envEnabled = String(import.meta?.env?.VITE_AGENT_LOG_ENABLED || '').toLowerCase();
    if (envEnabled === 'true' || envEnabled === '1') return true;
  } catch {
    // ignore
  }

  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem('AGENT_LOG_ENABLED') === '1';
  } catch {
    return false;
  }
};

// Small throttle to prevent log storms (especially during rapid rerenders / subscription bursts)
const lastSentAtByKey = new Map();
const THROTTLE_MS = 1500;

export function agentLog(payload) {
  if (!isEnabled()) return;

  try {
    const url = getIngestUrl();
    const key = `${payload?.location || 'unknown'}:${payload?.message || 'log'}`;
    const now = Date.now();
    const last = lastSentAtByKey.get(key) || 0;
    if (now - last < THROTTLE_MS) return;
    lastSentAtByKey.set(key, now);

    const body = JSON.stringify({
      ...payload,
      timestamp: payload?.timestamp ?? now,
    });

    // keepalive helps avoid "canceled" logs during navigation
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never break app flow for debug logging
  }
}






