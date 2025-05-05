/*
  Warnings:

  - The `onboardingStatus` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "onboardingStatus",
ADD COLUMN     "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED';
