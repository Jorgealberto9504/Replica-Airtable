export function healthStatus() {
  return { ok: true, ts: new Date().toISOString() };
}