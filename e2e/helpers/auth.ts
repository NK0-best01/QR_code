import { Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

if (!process.env.AUTH_SECRET) {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath);
  }
}

import { signSession } from '../../src/lib/auth/session';

import { PrismaClient } from '@prisma/client';
const helperPrisma = new PrismaClient();

export async function loginViaUi(
  page: Page,
  username = 'admin1',
  password = '1234'
) {
  await page.goto('/login');
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('#btn-login-submit');
  await page.waitForURL('**/dashboard');
}

export async function setAuthCookie(
  context: BrowserContext,
  role: 'admin' | 'user' = 'admin',
  username = role === 'admin' ? 'admin1' : 'user1',
  customSub?: string
) {
  let sub = customSub;
  if (!sub) {
    try {
      const user = await helperPrisma.user.findUnique({
        where: { username },
      });
      if (user) {
        sub = String(user.id);
      }
    } catch {
      // fallback if DB not reachable
    }
    if (!sub) {
      sub = role === 'admin' ? '1' : '2';
    }
  }

  const token = await signSession({
    sub,
    username,
    role,
  });

  await context.addCookies([
    {
      name: 'session',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  return token;
}
