export class AuthError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export function normalizeEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    throw new AuthError(400, 'INVALID_EMAIL', 'Bitte geben Sie eine gültige E-Mail-Adresse ein.');
  }
  return value.trim().toLowerCase();
}
