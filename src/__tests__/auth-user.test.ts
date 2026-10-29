import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { roleSchema, isValidRole } from "@/data/roles";
import { findUserByUsername } from "@/lib/auth/user-repo";
import { seedUsers } from "../../prisma/seed";
import { prisma } from "@/lib/db";

describe("Phase 10: User Model, Password Hashing & Seed", () => {
  beforeEach(async () => {
    // Ensure clean state for users in test suite
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // Re-seed after tests so dev db has test users available
    await seedUsers();
  });

  describe("Password Hashing & Verification (lib/auth/password.ts)", () => {
    it('hashPassword("1234") ≠ "1234" และขึ้นต้นด้วย $2 (bcrypt format)', async () => {
      const plain = "1234";
      const hash = await hashPassword(plain);

      expect(hash).not.toBe(plain);
      expect(hash.startsWith("$2")).toBe(true);
    });

    it("hash รหัสเดียวกัน 2 ครั้งได้ค่าไม่เท่ากัน (salt) แต่ verifyPassword ผ่านทั้งคู่", async () => {
      const plain = "1234";
      const hash1 = await hashPassword(plain);
      const hash2 = await hashPassword(plain);

      expect(hash1).not.toBe(hash2);
      expect(await verifyPassword(plain, hash1)).toBe(true);
      expect(await verifyPassword(plain, hash2)).toBe(true);
    });

    it("verifyPassword รหัสผิด → false และ hash เสียรูปแบบ → false โดยไม่ throw", async () => {
      const hash = await hashPassword("1234");

      expect(await verifyPassword("wrongpassword", hash)).toBe(false);
      expect(await verifyPassword("1234", "malformed-hash")).toBe(false);
      expect(await verifyPassword("", hash)).toBe(false);
      // @ts-expect-error test invalid types
      expect(await verifyPassword(null, hash)).toBe(false);
    });
  });

  describe("Roles Validation (data/roles.ts)", () => {
    it("zod role schema อนุญาตเฉพาะ admin และ user", () => {
      expect(roleSchema.safeParse("admin").success).toBe(true);
      expect(roleSchema.safeParse("user").success).toBe(true);
      expect(isValidRole("admin")).toBe(true);
      expect(isValidRole("user")).toBe(true);
    });

    it('zod role schema ปฏิเสธ "root", "superadmin", "", "ADMIN"', () => {
      expect(roleSchema.safeParse("root").success).toBe(false);
      expect(roleSchema.safeParse("superadmin").success).toBe(false);
      expect(roleSchema.safeParse("ADMIN").success).toBe(false);
      expect(roleSchema.safeParse("").success).toBe(false);
      expect(isValidRole("root")).toBe(false);
      expect(isValidRole("superadmin")).toBe(false);
    });
  });

  describe("Database Seeding & Idempotency (prisma/seed.ts)", () => {
    it('seed แล้วตาราง User มี 2 แถว และ passwordHash ไม่ใช่ "1234"', async () => {
      await seedUsers();

      const users = await prisma.user.findMany();
      expect(users).toHaveLength(2);

      const admin = users.find((u) => u.username === "admin1");
      const user = users.find((u) => u.username === "user1");

      expect(admin).toBeDefined();
      expect(admin?.role).toBe("admin");
      expect(admin?.passwordHash).not.toBe("1234");
      expect(admin?.passwordHash.startsWith("$2")).toBe(true);

      expect(user).toBeDefined();
      expect(user?.role).toBe("user");
      expect(user?.passwordHash).not.toBe("1234");
      expect(user?.passwordHash.startsWith("$2")).toBe(true);

      // Verify passwords authenticate correctly
      expect(await verifyPassword("1234", admin!.passwordHash)).toBe(true);
      expect(await verifyPassword("1234", user!.passwordHash)).toBe(true);
    });

    it("seed ซ้ำ → ยังคงมี 2 แถวเดิม ไม่สร้างเพิ่ม (idempotent)", async () => {
      await seedUsers();
      await seedUsers();

      const count = await prisma.user.count();
      expect(count).toBe(2);
    });

    it("seed ใน NODE_ENV=production → ปฏิเสธ ไม่เขียน DB", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        await expect(seedUsers()).rejects.toThrow("Refusing to seed database in production environment!");
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it("seed ไม่สร้าง user ชื่อ root หรือ superadmin", async () => {
      await seedUsers();
      const rootUser = await prisma.user.findUnique({ where: { username: "root" } });
      const superAdminUser = await prisma.user.findUnique({ where: { username: "superadmin" } });

      expect(rootUser).toBeNull();
      expect(superAdminUser).toBeNull();
    });
  });

  describe("User Repository (lib/auth/user-repo.ts)", () => {
    beforeEach(async () => {
      await seedUsers();
    });

    it('findUserByUsername("ADMIN1") เจอ admin1 (case-insensitive normalize)', async () => {
      const userLower = await findUserByUsername("admin1");
      const userUpper = await findUserByUsername("ADMIN1");
      const userMixed = await findUserByUsername("  Admin1  ");

      expect(userLower).not.toBeNull();
      expect(userUpper).not.toBeNull();
      expect(userMixed).not.toBeNull();
      expect(userUpper?.id).toBe(userLower?.id);
      expect(userMixed?.id).toBe(userLower?.id);
      expect(userUpper?.role).toBe("admin");
    });

    it("ค้นหา username ที่มีอักขระพิเศษ หรือ SQL injection → ไม่เจอ ตารางยังอยู่ครบ", async () => {
      const injectionUser = await findUserByUsername("'; DROP TABLE User; --");
      expect(injectionUser).toBeNull();

      const count = await prisma.user.count();
      expect(count).toBe(2);
    });
  });
});
