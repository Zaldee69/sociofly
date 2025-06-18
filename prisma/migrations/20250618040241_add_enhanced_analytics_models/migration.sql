/*
  Warnings:

  - You are about to drop the `CronLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('IMAGE', 'VIDEO', 'CAROUSEL', 'REELS', 'STORY', 'IGTV');

-- CreateEnum
CREATE TYPE "StoryType" AS ENUM ('IMAGE', 'VIDEO', 'BOOMERANG', 'SUPERZOOM', 'REWIND');

-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('BIO', 'POST', 'STORY', 'BUTTON', 'SWIPE_UP');

-- AlterTable
ALTER TABLE "AccountAnalytics" ADD COLUMN     "avgCommentsPerPost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "avgLikesPerPost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "followingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unfollowCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PostAnalytics" ADD COLUMN     "contentFormat" "ContentFormat",
ADD COLUMN     "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reactions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "saves" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timeToEngagement" INTEGER;

-- AlterTable
ALTER TABLE "PostAnalyticsDemographics" ADD COLUMN     "postAnalyticsId" TEXT;

-- DropTable
DROP TABLE "CronLog";

-- CreateTable
CREATE TABLE "TaskLog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT,

    CONSTRAINT "TaskLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryAnalytics" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "exits" INTEGER NOT NULL DEFAULT 0,
    "forwards" INTEGER NOT NULL DEFAULT 0,
    "tapsNext" INTEGER NOT NULL DEFAULT 0,
    "tapsPrevious" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storyType" "StoryType" NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceInsights" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "gender" TEXT,
    "topCountry" TEXT,
    "topCity" TEXT,
    "percentage" DOUBLE PRECISION NOT NULL,
    "activeHours" JSONB NOT NULL,
    "activeDays" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudienceInsights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HashtagAnalytics" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "hashtag" TEXT NOT NULL,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "discovery" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isTop" BOOLEAN NOT NULL DEFAULT false,
    "rank" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HashtagAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostHashtagAnalytics" (
    "id" TEXT NOT NULL,
    "postAnalyticsId" TEXT NOT NULL,
    "hashtagAnalyticsId" TEXT NOT NULL,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PostHashtagAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkAnalytics" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "linkType" "LinkType" NOT NULL,
    "buttonType" TEXT,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "uniqueClicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourcePostId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskLog_name_idx" ON "TaskLog"("name");

-- CreateIndex
CREATE INDEX "TaskLog_status_idx" ON "TaskLog"("status");

-- CreateIndex
CREATE INDEX "TaskLog_executedAt_idx" ON "TaskLog"("executedAt");

-- CreateIndex
CREATE INDEX "StoryAnalytics_socialAccountId_idx" ON "StoryAnalytics"("socialAccountId");

-- CreateIndex
CREATE INDEX "StoryAnalytics_publishedAt_idx" ON "StoryAnalytics"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoryAnalytics_socialAccountId_storyId_key" ON "StoryAnalytics"("socialAccountId", "storyId");

-- CreateIndex
CREATE INDEX "AudienceInsights_socialAccountId_idx" ON "AudienceInsights"("socialAccountId");

-- CreateIndex
CREATE INDEX "AudienceInsights_recordedAt_idx" ON "AudienceInsights"("recordedAt");

-- CreateIndex
CREATE INDEX "HashtagAnalytics_socialAccountId_idx" ON "HashtagAnalytics"("socialAccountId");

-- CreateIndex
CREATE INDEX "HashtagAnalytics_hashtag_idx" ON "HashtagAnalytics"("hashtag");

-- CreateIndex
CREATE INDEX "HashtagAnalytics_isTop_idx" ON "HashtagAnalytics"("isTop");

-- CreateIndex
CREATE UNIQUE INDEX "HashtagAnalytics_socialAccountId_hashtag_recordedAt_key" ON "HashtagAnalytics"("socialAccountId", "hashtag", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostHashtagAnalytics_postAnalyticsId_hashtagAnalyticsId_key" ON "PostHashtagAnalytics"("postAnalyticsId", "hashtagAnalyticsId");

-- CreateIndex
CREATE INDEX "LinkAnalytics_socialAccountId_idx" ON "LinkAnalytics"("socialAccountId");

-- CreateIndex
CREATE INDEX "LinkAnalytics_linkType_idx" ON "LinkAnalytics"("linkType");

-- CreateIndex
CREATE INDEX "LinkAnalytics_recordedAt_idx" ON "LinkAnalytics"("recordedAt");

-- CreateIndex
CREATE INDEX "PostAnalytics_engagement_idx" ON "PostAnalytics"("engagement");

-- AddForeignKey
ALTER TABLE "StoryAnalytics" ADD CONSTRAINT "StoryAnalytics_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceInsights" ADD CONSTRAINT "AudienceInsights_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HashtagAnalytics" ADD CONSTRAINT "HashtagAnalytics_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostHashtagAnalytics" ADD CONSTRAINT "PostHashtagAnalytics_postAnalyticsId_fkey" FOREIGN KEY ("postAnalyticsId") REFERENCES "PostAnalytics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostHashtagAnalytics" ADD CONSTRAINT "PostHashtagAnalytics_hashtagAnalyticsId_fkey" FOREIGN KEY ("hashtagAnalyticsId") REFERENCES "HashtagAnalytics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkAnalytics" ADD CONSTRAINT "LinkAnalytics_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAnalyticsDemographics" ADD CONSTRAINT "PostAnalyticsDemographics_postAnalyticsId_fkey" FOREIGN KEY ("postAnalyticsId") REFERENCES "PostAnalytics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
