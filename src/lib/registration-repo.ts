import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './db';
import { DeviceTypeCode } from '@/data/device-types';
import { formatDeviceId } from './device-id';
import { RegistrationInput } from './schemas';
import { RegistrationStatus, isValidRegistrationStatus } from '@/data/registration-status';
import { isPointInProvince } from './province-geo';
import messages from './messages';

export class DuplicateUidError extends Error {
  statusCode: number;

  constructor(message = messages.register.uidAlreadyRegistered) {
    super(message);
    this.name = 'DuplicateUidError';
    this.statusCode = 409;
  }
}

export class NotFoundError extends Error {
  statusCode: number;
  code: string;

  constructor(message = 'ไม่พบข้อมูลที่ต้องการ') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.code = 'NOT_FOUND';
  }
}

export class AlreadyRegisteredError extends Error {
  statusCode: number;
  code: string;

  constructor(message = 'รายการนี้ได้รับการยืนยันการลงทะเบียนแล้ว') {
    super(message);
    this.name = 'AlreadyRegisteredError';
    this.statusCode = 409;
    this.code = 'ALREADY_REGISTERED';
  }
}

export class NotRegisteredError extends Error {
  statusCode: number;
  code: string;

  constructor(message = 'รายการนี้ยังไม่ได้ลงทะเบียน ต้องยืนยันก่อนจึงจะแก้ไขหมุดได้') {
    super(message);
    this.name = 'NotRegisteredError';
    this.statusCode = 409;
    this.code = 'NOT_REGISTERED';
  }
}

export class PinOutsideProvinceError extends Error {
  statusCode: number;
  code: string;

  constructor(message = 'พิกัดที่ระบุอยู่นอกขอบเขตของจังหวัด') {
    super(message);
    this.name = 'PinOutsideProvinceError';
    this.statusCode = 400;
    this.code = 'PIN_OUTSIDE_PROVINCE';
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
              status: 'UNREGISTERED',
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
          throw new DuplicateUidError();
        }
        if (attempt < maxRetries) {
          const delay = Math.random() * 100 + attempt * 50;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

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
    include: {
      confirmedBy: { select: { id: true, username: true } },
    },
  });
}

export async function findById(
  id: number,
  client: PrismaClient = prisma
) {
  return client.registration.findUnique({
    where: { id },
    include: {
      confirmedBy: { select: { id: true, username: true } },
    },
  });
}

export interface ListRegistrationsParams {
  status?: string | null;
  page?: number;
  pageSize?: number;
}

export interface ListRegistrationsResult {
  counts: {
    UNREGISTERED: number;
    REGISTERED: number;
  };
  items: Array<{
    id: number;
    uid: string;
    region: string;
    province: string;
    deviceType: string;
    seq: number;
    deviceId: string;
    status: string;
    latitude: number | null;
    longitude: number | null;
    createdAt: Date;
    confirmedAt: Date | null;
    confirmedBy: { id: number; username: string } | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Lists registrations with pagination, filtering by status, and overall status counts.
 * Orders by createdAt desc, id desc.
 */
export async function listRegistrations(
  params: ListRegistrationsParams = {},
  client: PrismaClient = prisma
): Promise<ListRegistrationsResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  let filterStatus: RegistrationStatus | undefined = undefined;
  if (params.status && params.status.trim()) {
    const raw = params.status.trim();
    if (!isValidRegistrationStatus(raw)) {
      throw new Error(`สถานะการลงทะเบียนไม่ถูกต้อง: "${raw}"`);
    }
    filterStatus = raw;
  }

  // Counts for each status are always calculated across all records
  const [unregisteredCount, registeredCount] = await Promise.all([
    client.registration.count({ where: { status: 'UNREGISTERED' } }),
    client.registration.count({ where: { status: 'REGISTERED' } }),
  ]);

  const whereClause: Prisma.RegistrationWhereInput = filterStatus
    ? { status: filterStatus }
    : {};

  const [items, total] = await Promise.all([
    client.registration.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        uid: true,
        region: true,
        province: true,
        deviceType: true,
        seq: true,
        deviceId: true,
        status: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        confirmedAt: true,
        confirmedBy: {
          select: { id: true, username: true },
        },
      },
    }),
    client.registration.count({ where: whereClause }),
  ]);

  return {
    counts: {
      UNREGISTERED: unregisteredCount,
      REGISTERED: registeredCount,
    },
    items,
    total,
    page,
    pageSize,
  };
}

/**
 * Confirms registration by pinning latitude/longitude atomically.
 * Prevents race condition between concurrent admins using updateMany count.
 */
export async function confirmRegistration(
  id: number,
  coords: { latitude: number; longitude: number },
  actorId: number,
  client: PrismaClient = prisma
) {
  const existing = await client.registration.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError(`ไม่พบรายการลงทะเบียนรหัส ${id}`);
  }

  // Validate point-in-province
  const isInside = isPointInProvince(
    existing.province,
    coords.latitude,
    coords.longitude
  );
  if (!isInside) {
    throw new PinOutsideProvinceError(
      `พิกัด (${coords.latitude}, ${coords.longitude}) อยู่นอกขอบเขตจังหวัด ${existing.province}`
    );
  }

  // Atomic update using updateMany with where status: "UNREGISTERED"
  return await client.$transaction(
    async (tx) => {
      const updateResult = await tx.registration.updateMany({
        where: { id, status: 'UNREGISTERED' },
        data: {
          status: 'REGISTERED',
          latitude: coords.latitude,
          longitude: coords.longitude,
          confirmedAt: new Date(),
          confirmedById: actorId,
        },
      });

      if (updateResult.count === 0) {
        const check = await tx.registration.findUnique({ where: { id } });
        if (!check) throw new NotFoundError();
        if (check.status === 'REGISTERED') throw new AlreadyRegisteredError();
        throw new Error('ไม่สามารถยืนยันรายการลงทะเบียนได้');
      }

      // Write append-only pin log
      await tx.registrationPinLog.create({
        data: {
          registrationId: id,
          action: 'CONFIRM',
          oldLatitude: null,
          oldLongitude: null,
          newLatitude: coords.latitude,
          newLongitude: coords.longitude,
          actorId,
        },
      });

      return await tx.registration.findUniqueOrThrow({
        where: { id },
        include: {
          confirmedBy: { select: { id: true, username: true } },
        },
      });
    },
    { maxWait: 15000, timeout: 15000 }
  );
}

/**
 * Updates pin coordinates for an already REGISTERED registration.
 * Uses compare-and-swap with retry to ensure consistent pin audit logs.
 */
export async function updatePin(
  id: number,
  coords: { latitude: number; longitude: number },
  actorId: number,
  client: PrismaClient = prisma
) {
  const existing = await client.registration.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError(`ไม่พบรายการลงทะเบียนรหัส ${id}`);
  }

  if (existing.status !== 'REGISTERED') {
    throw new NotRegisteredError(
      `รายการนี้ยังไม่ได้รับการยืนยัน (สถานะ: ${existing.status}) ต้องยืนยันก่อนจึงจะแก้ไขหมุดได้`
    );
  }

  // If coordinates are identical, return unchanged without writing log
  if (
    existing.latitude === coords.latitude &&
    existing.longitude === coords.longitude
  ) {
    return existing;
  }

  // Validate point-in-province
  const isInside = isPointInProvince(
    existing.province,
    coords.latitude,
    coords.longitude
  );
  if (!isInside) {
    throw new PinOutsideProvinceError(
      `พิกัด (${coords.latitude}, ${coords.longitude}) อยู่นอกขอบเขตจังหวัด ${existing.province}`
    );
  }

  // Compare-and-swap retry loop (up to 3 times)
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await client.$transaction(
        async (tx) => {
          const current = await tx.registration.findUnique({
            where: { id },
          });

          if (!current) throw new NotFoundError();
          if (current.status !== 'REGISTERED') throw new NotRegisteredError();

          // If someone already updated to the exact same coordinates
          if (
            current.latitude === coords.latitude &&
            current.longitude === coords.longitude
          ) {
            return current;
          }

          // Compare-and-swap update
          const updateResult = await tx.registration.updateMany({
            where: {
              id,
              status: 'REGISTERED',
              latitude: current.latitude,
              longitude: current.longitude,
            },
            data: {
              latitude: coords.latitude,
              longitude: coords.longitude,
            },
          });

          if (updateResult.count === 0) {
            // Concurrent modification, retry
            throw new Error('CAS_FAILED');
          }

          // Write append-only pin log
          await tx.registrationPinLog.create({
            data: {
              registrationId: id,
              action: 'UPDATE',
              oldLatitude: current.latitude,
              oldLongitude: current.longitude,
              newLatitude: coords.latitude,
              newLongitude: coords.longitude,
              actorId,
            },
          });

          return await tx.registration.findUniqueOrThrow({
            where: { id },
            include: {
              confirmedBy: { select: { id: true, username: true } },
            },
          });
        },
        { maxWait: 15000, timeout: 15000 }
      );

      return result;
    } catch (err: unknown) {
      const isCasFailed = err instanceof Error && err.message === 'CAS_FAILED';
      if (isCasFailed && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, Math.random() * 50 + 20));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Failed to update pin due to concurrent modifications');
}

/**
 * Lists pin audit logs for a registration, sorted newest first.
 */
export async function listPinLogs(
  registrationId: number,
  client: PrismaClient = prisma
) {
  const existing = await client.registration.findUnique({
    where: { id: registrationId },
  });

  if (!existing) {
    throw new NotFoundError(`ไม่พบรายการลงทะเบียนรหัส ${registrationId}`);
  }

  const logs = await client.registrationPinLog.findMany({
    where: { registrationId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      actor: {
        select: { username: true },
      },
    },
  });

  return {
    items: logs.map((log) => ({
      id: log.id,
      action: log.action,
      oldLatitude: log.oldLatitude,
      oldLongitude: log.oldLongitude,
      newLatitude: log.newLatitude,
      newLongitude: log.newLongitude,
      actorUsername: log.actor.username,
      createdAt: log.createdAt,
    })),
  };
}

/**
 * Returns all confirmed registrations with valid coordinates for Map rendering.
 */
export async function listConfirmedPins(client: PrismaClient = prisma) {
  return client.registration.findMany({
    where: {
      status: 'REGISTERED',
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      deviceId: true,
      uid: true,
      province: true,
      region: true,
      deviceType: true,
      latitude: true,
      longitude: true,
      confirmedAt: true,
    },
    orderBy: [{ confirmedAt: 'desc' }, { id: 'desc' }],
  });
}
