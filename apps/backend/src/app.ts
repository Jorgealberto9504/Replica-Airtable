// apps/backend/src/app.ts
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import healthRouter from './routes/health.routes.js';
import dbRouter from './routes/db.routes.js';
import authRouter from './routes/auth.routes.js'; // <-- NUEVO
import usersRouter from './routes/users.routes.js'; // <-- NUEVO


const app = express();


const FRONTEND = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
app.use(cors({
  origin: FRONTEND,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser()); // <-- ya lo dejamos listo para 3.3 (login/cookies)

// rutas
app.use('/health', healthRouter);
app.use('/db', dbRouter);
app.use('/auth', authRouter); // <-- NUEVO
app.use('/users', usersRouter); // <-- NUEVO

export default app;