const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning database ---');

  // 1. Delete all pin logs
  const deletedLogs = await prisma.registrationPinLog.deleteMany({});
  console.log(`✓ ลบประวัติ Pin Logs ทั้งหมด: ${deletedLogs.count} รายการ`);

  // 2. Delete all registrations
  const deletedRegs = await prisma.registration.deleteMany({});
  console.log(`✓ ลบข้อมูลการลงทะเบียนทั้งหมด: ${deletedRegs.count} รายการ`);

  // 3. Reset device counters
  const deletedCounters = await prisma.deviceCounter.deleteMany({});
  console.log(`✓ รีเซ็ตตัวนับลำดับ Device Counter: ${deletedCounters.count} ประเภท`);

  // 4. Reset sqlite autoincrement sequence
  try {
    await prisma.$executeRawUnsafe(
      "DELETE FROM sqlite_sequence WHERE name IN ('Registration', 'RegistrationPinLog')"
    );
    console.log('✓ รีเซ็ต Auto-increment sequence กลับเป็น 1 เรียบร้อย');
  } catch (err) {
    console.warn('⚠️ ไม่สามารถรีเซ็ต sequence ได้:', err.message);
  }

  // 5. Verify counts
  const regCount = await prisma.registration.count();
  const pinLogCount = await prisma.registrationPinLog.count();
  const counterCount = await prisma.deviceCounter.count();
  const users = await prisma.user.findMany({ select: { id: true, username: true, role: true } });

  console.log('\n--- สรุปสถานะฐานข้อมูลหลังล้างข้อมูล ---');
  console.log({
    registrationsRemaining: regCount,
    pinLogsRemaining: pinLogCount,
    deviceCountersRemaining: counterCount,
    usersRemaining: users.length,
    usersList: users,
  });
}

main()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
