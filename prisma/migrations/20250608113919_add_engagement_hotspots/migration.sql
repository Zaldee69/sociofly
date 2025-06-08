-- CreateTable
CREATE TABLE "EngagementHotspot" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementHotspot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EngagementHotspot_socialAccountId_idx" ON "EngagementHotspot"("socialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "EngagementHotspot_socialAccountId_dayOfWeek_hourOfDay_key" ON "EngagementHotspot"("socialAccountId", "dayOfWeek", "hourOfDay");

-- AddForeignKey
ALTER TABLE "EngagementHotspot" ADD CONSTRAINT "EngagementHotspot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementHotspot" ADD CONSTRAINT "EngagementHotspot_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
