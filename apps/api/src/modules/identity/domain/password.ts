import bcrypt from "bcryptjs";

const COSTO_HASH = 12;

export function cifrarPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COSTO_HASH);
}

export function verificarPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
