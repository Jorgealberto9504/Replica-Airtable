import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.routes.js';
import dbRoutes from './routes/db.routes.js';


export const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/db', dbRoutes);
