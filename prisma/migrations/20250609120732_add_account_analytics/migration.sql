-- CreateTable
CREATE TABLE "AccountAnalytics" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followersCount" INTEGER NOT NULL,
    "mediaCount" INTEGER NOT NULL,

    CONSTRAINT "AccountAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountAnalytics_socialAccountId_idx" ON "AccountAnalytics"("socialAccountId");

-- CreateIndex
CREATE INDEX "AccountAnalytics_recordedAt_idx" ON "AccountAnalytics"("recordedAt");

-- AddForeignKey
ALTER TABLE "AccountAnalytics" ADD CONSTRAINT "AccountAnalytics_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
