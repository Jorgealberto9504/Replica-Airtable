// apps/backend/src/services/security/jwt.service.ts
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

const SECRET: Secret = process.env.JWT_SECRET as string; // <- forzamos a Secret
if (!SECRET) throw new Error('JWT_SECRET no configurado');

const EXPIRES_IN: SignOptions['expiresIn'] =
  (process.env.JWT_EXPIRES_IN as any) ?? '7d'; // <- tipo correcto para expiresIn

export type JwtPayload = {
  sub: string;     // id del usuario
  email?: string;
  role?: string;
};

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyJwt<T = JwtPayload>(token: string): T {
  return jwt.verify(token, SECRET) as T;
}