-- CreateTable
CREATE TABLE "CronLog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT,

    CONSTRAINT "CronLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronLog_name_idx" ON "CronLog"("name");

-- CreateIndex
CREATE INDEX "CronLog_status_idx" ON "CronLog"("status");

-- CreateIndex
CREATE INDEX "CronLog_executedAt_idx" ON "CronLog"("executedAt");
