// apps/backend/src/utils/currentUser.ts
import { Request, Response } from 'express';

export function currentUserId(req: Request, res: Response): number | null {
  const raw = (req as any)?.user?.id ?? res.locals?.user?.id ?? (req as any)?.auth?.userId;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}