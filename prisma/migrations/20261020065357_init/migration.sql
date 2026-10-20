-- CreateTable
CREATE TABLE "DeviceCounter" (
    "deviceType" TEXT NOT NULL PRIMARY KEY,
    "lastSeq" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uid" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "deviceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Registration_uid_key" ON "Registration"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_deviceId_key" ON "Registration"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_deviceType_seq_key" ON "Registration"("deviceType", "seq");
