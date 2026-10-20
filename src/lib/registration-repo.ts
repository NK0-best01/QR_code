import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './db';
import { DeviceTypeCode } from '@/data/device-types';
import { formatDeviceId } from './device-id';
import { RegistrationInput } from './schemas';
import messages from './messages';

export class DuplicateUidError extends Error {
  statusCode: number;

  constructor(message = messages.register.uidAlreadyRegistered) {
    super(message);
    this.name = 'DuplicateUidError';
    this.statusCode = 409;
  }
}

function isUidCollision(error: Prisma.PrismaClientKnownRequestError): boolean {
  if (error.code !== 'P2002') return false;
  const target = JSON.stringify(error.meta?.target ?? '');
  if (target.includes('uid')) return true;
  if (error.message.includes('uid') || error.message.includes('Registration.uid')) return true;
  return false;
}

function isTransientError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P1008: Socket timeout / database failed to respond in time (SQLite contention)
    // P2034: Transaction failed due to a write conflict or a deadlock
    if (error.code === 'P1008' || error.code === 'P2034') return true;
  }
  const msg = error instanceof Error ? error.message : '';
  if (msg.includes('SQLITE_BUSY') || msg.includes('database is locked') || msg.includes('Socket timeout')) {
    return true;
  }
  return false;
}

export async function createRegistration(
  input: RegistrationInput,
  client: PrismaClient = prisma
) {
  const maxRetries = 5;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.$transaction(
        async (tx) => {
          const counter = await tx.deviceCounter.upsert({
            where: { deviceType: input.deviceType },
            update: { lastSeq: { increment: 1 } },
            create: { deviceType: input.deviceType, lastSeq: 1 },
          });

          const deviceId = formatDeviceId(input.deviceType, counter.lastSeq);

          return await tx.registration.create({
            data: {
              uid: input.uid,
              region: input.region,
              province: input.province,
              deviceType: input.deviceType,
              seq: counter.lastSeq,
              deviceId,
            },
          });
        },
        {
          maxWait: 30000,
          timeout: 30000,
        }
      );
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        if (isUidCollision(error)) {
          // Transaction rolled back completely, lastSeq is not committed.
          throw new DuplicateUidError();
        }
        // Collision on deviceId or (deviceType, seq) - retry
        if (attempt < maxRetries) {
          const delay = Math.random() * 100 + attempt * 50;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

      // Retry on SQLite transient lock or socket timeout contention
      if (isTransientError(error) && attempt < maxRetries) {
        const delay = Math.random() * 150 + attempt * 100;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw error;
    }
  }

  throw new Error('Failed to reserve Device ID after multiple attempts');
}

export async function peekNextSeq(
  deviceType: DeviceTypeCode,
  client: PrismaClient = prisma
): Promise<number> {
  const counter = await client.deviceCounter.findUnique({
    where: { deviceType },
  });
  return (counter?.lastSeq ?? 0) + 1;
}

export async function peekNextDeviceId(
  deviceType: DeviceTypeCode,
  client: PrismaClient = prisma
): Promise<string> {
  const nextSeq = await peekNextSeq(deviceType, client);
  return formatDeviceId(deviceType, nextSeq);
}

export async function findByUid(
  uid: string,
  client: PrismaClient = prisma
) {
  return client.registration.findUnique({
    where: { uid },
  });
}
