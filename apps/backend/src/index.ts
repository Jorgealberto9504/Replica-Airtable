import 'dotenv/config';
import app from './app.js';
import { startTrashPurgeJob } from './jobs/trash-purge.job.js';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startTrashPurgeJob();
});