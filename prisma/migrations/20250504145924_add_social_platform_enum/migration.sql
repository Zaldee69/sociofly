/*
  Warnings:

  - Changed the type of `platform` on the `SocialAccount` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TWITTER', 'LINKEDIN', 'TIKTOK', 'YOUTUBE');

-- AlterTable
ALTER TABLE "SocialAccount" DROP COLUMN "platform",
ADD COLUMN     "platform" "SocialPlatform" NOT NULL;
