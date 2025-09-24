import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import healthRouter from './routes/health.routes.js';
import dbRouter from './routes/db.routes.js';
import authRouter from './routes/auth.routes.js';
import usersRouter from './routes/users.routes.js';
import membersRouter from './routes/members.routes.js';
import basesRouter from './routes/bases.routes.js';
import tablesRouter from './routes/tables.routes.js';
import workspacesRouter from './routes/workspaces.routes.js';

// 👇 NUEVO: endpoints CRUD de columnas y registros
import fieldsRouter from './routes/fields.routes.js';
import recordsRouter from './routes/records.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';


const app = express();

const FRONTEND = process.env.FRONTEND_ORIGIN
app.use(
  cors({
    origin: FRONTEND,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ---------- rutas ----------
app.use('/health', healthRouter);
app.use('/db', dbRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);

// /bases/*
app.use('/bases', membersRouter);
app.use('/bases', basesRouter);
app.use('/bases', tablesRouter);

// /workspaces/*
app.use('/workspaces', workspacesRouter);

// 👇 NUEVO: rutas anidadas de tablas
//    Cada router interno usa `mergeParams: true`, por eso aquí montamos la ruta completa
app.use('/bases/:baseId/tables/:tableId/fields', fieldsRouter);
app.use('/bases/:baseId/tables/:tableId/records', recordsRouter);

app.use(errorHandler);
export default app;