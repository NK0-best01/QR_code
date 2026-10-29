import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return null;
  }
  return prisma.user.findUnique({
    where: { username: normalized },
  });
}
