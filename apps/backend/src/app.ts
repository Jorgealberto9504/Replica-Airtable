// apps/backend/src/app.ts
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import healthRouter from './routes/health.routes.js';
import dbRouter from './routes/db.routes.js';
import authRouter from './routes/auth.routes.js'; // <-- NUEVO

const app = express();

// middlewares base
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser()); // <-- ya lo dejamos listo para 3.3 (login/cookies)

// rutas
app.use('/health', healthRouter);
app.use('/db', dbRouter);
app.use('/auth', authRouter); // <-- NUEVO

export default app;