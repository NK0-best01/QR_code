import { z } from "zod";

export const ROLES = ["admin", "user"] as const;
export type Role = (typeof ROLES)[number];

export const roleSchema = z.enum(ROLES, {
  errorMap: () => ({ message: "บทบาทไม่ถูกต้อง" }),
});

export function isValidRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role);
}
