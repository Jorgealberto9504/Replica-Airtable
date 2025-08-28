// apps/backend/src/services/security/password.service.ts
import bcrypt from 'bcrypt';

//seguridad de el password
const ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

/** Crea un hash seguro a partir de la contraseña en texto plano. */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, ROUNDS);
}

/** Compara una contraseña en texto plano contra un hash guardado. */
export async function checkPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}



