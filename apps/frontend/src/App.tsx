// apps/frontend/src/App.tsx
import { useEffect, useState } from 'react';

// === URL del backend ===
// Tomamos la URL desde variables de entorno (Vite usa import.meta.env).
// Si no existe VITE_API_URL, usamos http://localhost:8080 como predeterminado.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// === Tipos esperados desde el backend (ayudan a TypeScript y al autocompletado) ===
type HealthRes = { ok: boolean; ts: string };            // Respuesta del GET /health
type DbCheckRes = { ok: true; db: 'connected' };         // Respuesta del GET /db/check

export default function App() {
  // === Estado de la UI ===
  // health/db guardan las respuestas del backend, error un mensaje si algo falla, loading para deshabilitar botón y mostrar textos de carga
  const [health, setHealth]   = useState<HealthRes | null>(null);
  const [db, setDb]           = useState<DbCheckRes | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // === Carga de datos desde el backend ===
  // Paso a paso:
  // 1) Limpiamos errores y activamos "loading".
  // 2) Opcionalmente limpiamos los datos previos (para que el UI muestre "Cargando…").
  // 3) Hacemos fetch a /health y parseamos el JSON tipándolo como HealthRes.
  // 4) Hacemos fetch a /db/check y parseamos el JSON tipándolo como DbCheckRes.
  // 5) Si algo falla, capturamos el error y lo mostramos.
  // 6) Apagamos "loading" en el finally.
  async function load() {
    setError(null);     // (1) limpiamos error previo
    setLoading(true);   // (1) indicamos que estamos cargando
    setHealth(null);    // (2) limpiamos valores previos para que el UI muestre "Cargando…"
    setDb(null);        // (2)

    try {
      // --- Llamada 1: GET /health ---
      // Construimos la URL usando la base + el path.
      const resH = await fetch(`${API_URL}/health`);
      // Validamos el status HTTP (resH.ok true si 2xx).
      if (!resH.ok) throw new Error(`GET /health → ${resH.status}`);
      // Extraemos el cuerpo como JSON y lo tipamos.
      const h: HealthRes = await resH.json();
      // Guardamos en estado para que React re-renderice y muestre el resultado.
      setHealth(h);

      
      // --- Llamada 2: GET /db/check ---
      const resD = await fetch(`${API_URL}/db/check`);
      if (!resD.ok) throw new Error(`GET /db/check → ${resD.status}`);
      const d: DbCheckRes = await resD.json();
      setDb(d);
    } catch (e) {
      // Cualquier error de red/parseo/status se captura aquí y lo llevamos al UI.
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      // Siempre se ejecuta: apagamos el "loading".
      setLoading(false);
    }
  }

  // === Efecto de montaje ===
  // Ejecuta load() una sola vez cuando el componente se monta.
  useEffect(() => {
    void load();
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1>Prueba conexión back y front</h1>
      {/* Mostramos la URL del backend para verificar contra qué ambiente estamos pegando */}
      <p><strong>API:</strong> {API_URL}</p>

      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {/* === Sección /health ===
            Si hay datos en "health", los mostramos formateados como JSON.
            Si no, mostramos "Cargando…" o invitamos a pulsar "Refrescar". */}
        <section style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          <h2>/health</h2>
          {health ? <pre>{JSON.stringify(health, null, 2)}</pre> : <p>{loading ? 'Cargando…' : 'Pulsa “Refrescar”'}</p>}
        </section>

        {/* === Sección /db/check === */}
        <section style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          <h2>/db/check</h2>
          {db ? <pre>{JSON.stringify(db, null, 2)}</pre> : <p>{loading ? 'Cargando…' : 'Pulsa “Refrescar”'}</p>}
        </section>

        {/* === Errores globales ===
            Si algo salió mal en cualquier fetch, mostramos el mensaje aquí. */}
        {error && (
          <section style={{ padding: 12, border: '1px solid #f88', background: '#fee', borderRadius: 8 }}>
            <h2>Error</h2>
            <pre>{error}</pre>
          </section>
        )}

        {/* === Botón para volver a ejecutar load() manualmente === */}
        <button onClick={() => void load()} disabled={loading}>
          {loading ? 'Cargando…' : 'Refrescar'}
        </button>
      </div>
    </main>
  );
}