/*
  Warnings:

  - Added the required column `followerGrowth` to the `AccountAnalytics` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AccountAnalytics" ADD COLUMN     "avgReachPerPost" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "followerGrowth" JSONB NOT NULL;
