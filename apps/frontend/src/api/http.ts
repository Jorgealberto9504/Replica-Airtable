// apps/frontend/src/api/http.ts

// URL del backend. Si no tienes VITE_API_URL en .env, usa localhost:8080
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// Maneja la respuesta del fetch.
// - Si todo bien -> devuelve res.json()
// - Si hubo error -> intenta leer { error } del servidor o usa un mensaje simple.
async function handleRes<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body && typeof body.error === 'string') {
        msg = body.error;
      }
    } catch {
      // Si no viene JSON, dejamos el msg por defecto.
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// GET sencillo: incluye cookies (para el JWT)
export async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    credentials: 'include', // envía/recibe cookies
  });
  return handleRes<T>(res);
}

// POST sencillo: incluye cookies y manda JSON
export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include', // envía/recibe cookies
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleRes<T>(res);
}