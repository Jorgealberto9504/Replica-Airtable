// apps/backend/src/index.ts
import 'dotenv/config';
import app from './app.js';
import { startTrashPurgeJob } from './jobs/trash-purge.job.js'; // <-- NUEVO

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startTrashPurgeJob(); // <-- NUEVO: programar purga automática al levantar el server
});