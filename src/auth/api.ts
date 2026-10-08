import { portalSlug } from './routes';
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string | null;
  companySlug: string | null;
  mustChangePassword: boolean;
}
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message); this.status = status; this.code = code;
  }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  const scope=portalSlug();
  try {
    response = await fetch(`/api${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { ...(scope ? {'X-Brudello-Portal':scope} : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Brudello-Request': '1' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Keine Verbindung zum Anmeldedienst. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new ApiError(response.status, data?.code ?? 'SERVER_ERROR',
    data?.error ?? 'Der Anmeldedienst ist nicht erreichbar. Bitte versuchen Sie es erneut.');
  return data as T;
}
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
