import { type Request, type Response } from 'express';
import { healthStatus } from '../services/health.service.js';

export function getHealth(_req: Request, res: Response) {
  res.json(healthStatus());
}