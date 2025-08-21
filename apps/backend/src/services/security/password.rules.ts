// apps/backend/src/services/security/password.rules.ts
const STRONG_PWD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

export function isStrongPassword(pwd: string): boolean {
  return STRONG_PWD_REGEX.test(pwd);
}

export const STRONG_PWD_HELP =
  'La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial.';