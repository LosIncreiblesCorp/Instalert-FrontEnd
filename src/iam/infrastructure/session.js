import { reactive } from 'vue';

const key = 'instalert-session';
const initial = () => ({ accessToken: null, expiresAt: null, userId: null, email: null, role: null,
  mustChangePassword: false, onboardingStep: null, hasApplicationAccess: false, profileCompleted: false,
  businessId: null, business: null, reason: null });
const state = reactive(initial());
const storage = () => { try { return globalThis.sessionStorage; } catch { return null; } };
export const currentSession = () => state;
export function clearSession(reason = null) {
  Object.assign(state, initial(), { reason });
  try { storage()?.removeItem(key); } catch { /* The in-memory session is still cleared. */ }
}
export function restoreSessionToken() {
  try {
    const saved = JSON.parse(storage()?.getItem(key) ?? 'null');
    if (typeof saved?.accessToken === 'string' && saved.accessToken && Date.parse(saved.expiresAt) > Date.now())
      Object.assign(state, { accessToken: saved.accessToken, expiresAt: saved.expiresAt });
    else clearSession(saved ? 'expired' : null);
  } catch { clearSession(); }
}
export function applySession(value) {
  if (typeof value?.userId !== 'string' || !value.userId || !['administrator', 'employee'].includes(value.role)
      || typeof value.email !== 'string') throw new Error('Invalid account response.');
  if (value.accessToken !== undefined && (typeof value.accessToken !== 'string' || !value.accessToken
      || !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= Date.now()))
    throw new Error('Invalid access token response.');
  Object.assign(state, value, { reason: null });
  try { if (state.accessToken && state.expiresAt)
    storage()?.setItem(key, JSON.stringify({ accessToken: state.accessToken, expiresAt: state.expiresAt }));
  } catch { /* Keep the current session usable if browser storage is unavailable. */ }
}
export function accessToken() {
  if (state.accessToken && Date.parse(state.expiresAt) <= Date.now()) clearSession('expired');
  return state.accessToken;
}
