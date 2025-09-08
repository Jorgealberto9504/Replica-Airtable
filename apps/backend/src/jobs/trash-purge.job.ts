// apps/backend/src/jobs/trash-purge.job.ts
import cron from 'node-cron';
import { purgeTrashedBasesOlderThan } from '../services/bases.service.js';
import { purgeTrashedTablesOlderThan } from '../services/tables.service.js';

// Configurable vía env; defaults sensatos
const TZ = process.env.TZ || process.env.TIMEZONE || 'America/Mexico_City'; // <-- NUEVO
const RETENTION_DAYS = Number.isFinite(Number(process.env.TRASH_RETENTION_DAYS))
  ? Number(process.env.TRASH_RETENTION_DAYS)
  : 30; // <-- NUEVO (30 días por defecto)

export function startTrashPurgeJob() {
  // Evitar correr en tests
  if (process.env.NODE_ENV === 'test') {
    console.log('[trash-purge] saltado en test env');
    return;
  }

  // Programar a las 03:30 todos los días (zona horaria MX)
  // Formato cron: min hora díaMes mes díaSemana
  cron.schedule('30 3 * * *', async () => {             // <-- NUEVO
    const startedAt = new Date();
    console.log(`[trash-purge] Iniciando purga automática (${RETENTION_DAYS} días) @ ${startedAt.toISOString()}`);
    try {
      // Importante: purgar tablas primero por si hay FK a bases
      await purgeTrashedTablesOlderThan(RETENTION_DAYS);
      await purgeTrashedBasesOlderThan(RETENTION_DAYS);
      console.log('[trash-purge] Purga completada OK');
    } catch (err) {
      console.error('[trash-purge] Error durante purga:', err);
    }
  }, { timezone: TZ });

  // (Opcional) Ejecutar una vez al arrancar si así lo decides por env
  if (process.env.TRASH_PURGE_RUN_ON_BOOT === 'true') { // <-- NUEVO opcional
    (async () => {
      console.log(`[trash-purge] RUN_ON_BOOT activo → purgando >= ${RETENTION_DAYS} días`);
      try {
        await purgeTrashedTablesOlderThan(RETENTION_DAYS);
        await purgeTrashedBasesOlderThan(RETENTION_DAYS);
        console.log('[trash-purge] RUN_ON_BOOT completado OK');
      } catch (err) {
        console.error('[trash-purge] RUN_ON_BOOT error:', err);
      }
    })();
  }

  console.log(`[trash-purge] Job programado diario 03:30 ${TZ}, retención=${RETENTION_DAYS} días`);
}