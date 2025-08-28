// apps/frontend/src/api/http.ts
// -----------------------------------------------------------------------------
// ¿Qué es este archivo?
// Es un “cliente HTTP” súper simple para el FRONT. Centraliza cómo llamamos al
// backend (URL base, headers, manejo de errores, envío de cookies).
// Así, las páginas NO usan fetch directamente: importan getJSON/postJSON.
// -----------------------------------------------------------------------------

// URL base del backend:
// - Primero intenta leer VITE_API_URL desde .env del frontend
// - Si no existe, usa http://localhost:8080 por defecto (útil en dev)
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// Manejo estándar de respuestas HTTP:
// - Si res.ok === false → intentamos leer { error } del backend y lanzamos Error
// - Si res.ok === true → devolvemos el body parseado como JSON tipado <T>
async function handleRes<T>(res: Response): Promise<T> {
  if (!res.ok) {
    // Mensaje base con código y texto (ej: "400 Bad Request")
    let msg = `${res.status} ${res.statusText}`;

    try {
      // Si el backend envió JSON con { error: "mensaje" }, lo usamos
      const body = await res.json();
      if (body && typeof body.error === 'string') msg = body.error;
    } catch {
      // Si no es JSON, dejamos el mensaje por defecto
    }

    // Lanzamos un Error → el caller (página o servicio) lo capturará en catch
    throw new Error(msg);
  }

  // Éxito: parseamos y devolvemos el JSON tipado
  return res.json() as Promise<T>;
}

// GET JSON genérico:
// - path es el endpoint (ej: "/auth/me")
// - credentials: 'include' asegura que se envíen/reciban cookies (JWT HttpOnly)
export async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include', // ← importante para sesiones con cookies
  });
  return handleRes<T>(res);
}

// POST JSON genérico:
// - Envía body como JSON
// - Incluye credenciales (cookies) para que el backend reconozca la sesión
export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include', // ← envía/recibe cookie HttpOnly del JWT
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleRes<T>(res);
}

