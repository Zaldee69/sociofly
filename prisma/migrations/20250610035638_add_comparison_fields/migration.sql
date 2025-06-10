-- AlterTable
ALTER TABLE "AccountAnalytics" ADD COLUMN     "engagementGrowthPercent" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "followersGrowthPercent" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "mediaGrowthPercent" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "previousAvgReachPerPost" INTEGER DEFAULT 0,
ADD COLUMN     "previousEngagementRate" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "previousFollowersCount" INTEGER DEFAULT 0,
ADD COLUMN     "previousMediaCount" INTEGER DEFAULT 0,
ADD COLUMN     "reachGrowthPercent" DOUBLE PRECISION DEFAULT 0;
