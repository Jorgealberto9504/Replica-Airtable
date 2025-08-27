// apps/frontend/src/api/auth.ts
// -----------------------------------------------------------------------------
// ¿Qué es este archivo?
//Centraliza las llamadas HTTP
// a rutas del backend bajo /auth (login/me/logout/admin/register, etc.).
// Ventajas:
//  - Las páginas NO usan fetch directo: importan funciones claras.
//  - Reutiliza los helpers de http.ts (que ya incluyen cookies del JWT).
// -----------------------------------------------------------------------------

// Helpers HTTP centralizados (ver: src/api/http.ts)
// - getJSON: hace GET y parsea JSON, lanza Error si status !ok
// - postJSON: hace POST (JSON), idem manejo de error
// Ambos incluyen `credentials: 'include'` para enviar/recibir la cookie HttpOnly.
import { getJSON, postJSON } from './http';

// Tipo de la respuesta para GET /auth/me
// `ok`: indica si la operación fue exitosa.
// `user`: (opcional) el usuario autenticado (si hay sesión válida).
export type MeResp = {
  ok: boolean;
  user?: {
    id: number;                           // ID del usuario en BD
    email: string;                        // email normalizado
    fullName: string;                     // nombre completo
    platformRole: 'USER' | 'SYSADMIN';    // rol global en la plataforma
    mustChangePassword: boolean;  // si debe cambiar password en primer login
    canCreateBases?: boolean;        
  };
};

// --- Auth: quién soy (sesión actual) ----------------------------------------
// Llama a GET /auth/me y devuelve { ok, user? }.
// Si el JWT en cookie es válido → vendrá `user`.
// Si no hay cookie o es inválida → { ok:false } o sin `user` (según backend).
export function fetchMe() {
  return getJSON<MeResp>('/auth/me');
}

// --- Auth: cerrar sesión -----------------------------------------------------
// Llama a POST /auth/logout, el backend limpia la cookie del JWT.
// Devuelve { ok: true } si todo salió bien.
export function doLogout() {
  return postJSON<{ ok: boolean }>('/auth/logout', {});
}

// --- Admin: registrar usuario ------------------------------------------------
// Llama a POST /auth/admin/register (SOLO SYSADMIN).
// body:
//  - email, fullName: datos del nuevo usuario
//  - tempPassword: contraseña temporal que deberá cambiar en su primer login
//  - platformRole (opcional): 'USER' (default) o 'SYSADMIN'
// Devuelve { ok, user? } (dependiendo de cómo responde tu backend).
export function adminRegisterUser(input: {
  email: string;
  fullName: string;
  tempPassword: string;
  platformRole?: 'USER' | 'SYSADMIN';
  canCreateBases?: boolean;           

}) {

  return postJSON<{ ok: boolean; user?: any }>('/auth/admin/register', input);
}