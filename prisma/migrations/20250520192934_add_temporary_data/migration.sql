-- CreateTable
CREATE TABLE "TemporaryData" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemporaryData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemporaryData_expiresAt_idx" ON "TemporaryData"("expiresAt");
