-- CreateTable
CREATE TABLE "RegistrationPinLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "registrationId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "oldLatitude" REAL,
    "oldLongitude" REAL,
    "newLatitude" REAL NOT NULL,
    "newLongitude" REAL NOT NULL,
    "actorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistrationPinLog_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RegistrationPinLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Registration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uid" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNREGISTERED',
    "latitude" REAL,
    "longitude" REAL,
    "confirmedAt" DATETIME,
    "confirmedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Registration_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Registration" ("createdAt", "deviceId", "deviceType", "id", "province", "region", "seq", "uid") SELECT "createdAt", "deviceId", "deviceType", "id", "province", "region", "seq", "uid" FROM "Registration";
DROP TABLE "Registration";
ALTER TABLE "new_Registration" RENAME TO "Registration";
CREATE UNIQUE INDEX "Registration_uid_key" ON "Registration"("uid");
CREATE UNIQUE INDEX "Registration_deviceId_key" ON "Registration"("deviceId");
CREATE INDEX "Registration_status_idx" ON "Registration"("status");
CREATE INDEX "Registration_createdAt_idx" ON "Registration"("createdAt");
CREATE UNIQUE INDEX "Registration_deviceType_seq_key" ON "Registration"("deviceType", "seq");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RegistrationPinLog_registrationId_idx" ON "RegistrationPinLog"("registrationId");

-- CreateIndex
CREATE INDEX "RegistrationPinLog_actorId_idx" ON "RegistrationPinLog"("actorId");

-- CreateIndex
CREATE INDEX "RegistrationPinLog_createdAt_idx" ON "RegistrationPinLog"("createdAt");
