-- AlterTable
ALTER TABLE "PostSocialAccount" ADD COLUMN     "platformPostId" TEXT;

-- CreateTable
CREATE TABLE "PostAnalytics" (
    "id" TEXT NOT NULL,
    "postSocialAccountId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostAnalyticsDemographics" (
    "id" TEXT NOT NULL,
    "postSocialAccountId" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "gender" TEXT,
    "location" TEXT,
    "percentage" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostAnalyticsDemographics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostAnalytics_postSocialAccountId_idx" ON "PostAnalytics"("postSocialAccountId");

-- CreateIndex
CREATE INDEX "PostAnalytics_recordedAt_idx" ON "PostAnalytics"("recordedAt");

-- CreateIndex
CREATE INDEX "PostAnalyticsDemographics_postSocialAccountId_idx" ON "PostAnalyticsDemographics"("postSocialAccountId");

-- CreateIndex
CREATE INDEX "PostAnalyticsDemographics_recordedAt_idx" ON "PostAnalyticsDemographics"("recordedAt");

-- AddForeignKey
ALTER TABLE "PostAnalytics" ADD CONSTRAINT "PostAnalytics_postSocialAccountId_fkey" FOREIGN KEY ("postSocialAccountId") REFERENCES "PostSocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
