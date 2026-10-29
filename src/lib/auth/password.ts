import bcrypt from "bcryptjs";

export const DEFAULT_BCRYPT_ROUNDS = 10;

export function getBcryptRounds(): number {
  const envRounds = process.env.BCRYPT_ROUNDS;
  if (envRounds) {
    const parsed = parseInt(envRounds, 10);
    if (!isNaN(parsed) && parsed >= 4) {
      return parsed;
    }
  }
  return DEFAULT_BCRYPT_ROUNDS;
}

export async function hashPassword(plain: string): Promise<string> {
  const rounds = getBcryptRounds();
  return bcrypt.hash(plain, rounds);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    if (!plain || !hash || typeof plain !== "string" || typeof hash !== "string") {
      return false;
    }
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
