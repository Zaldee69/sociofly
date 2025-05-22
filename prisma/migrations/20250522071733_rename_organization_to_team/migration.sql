/*
  Warnings:

  - You are about to drop the column `organizationId` on the `ApprovalWorkflow` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `CustomRole` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Invitation` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Media` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `SocialAccount` table. All the data in the column will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name,teamId]` on the table `ApprovalWorkflow` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,teamId]` on the table `CustomRole` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,teamId]` on the table `Invitation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,teamId]` on the table `Membership` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `teamId` to the `ApprovalWorkflow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamId` to the `CustomRole` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamId` to the `Invitation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamId` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamId` to the `Membership` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamId` to the `Post` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamId` to the `SocialAccount` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ApprovalWorkflow" DROP CONSTRAINT "ApprovalWorkflow_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "CustomRole" DROP CONSTRAINT "CustomRole_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Media" DROP CONSTRAINT "Media_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "SocialAccount" DROP CONSTRAINT "SocialAccount_organizationId_fkey";

-- DropIndex
DROP INDEX "ApprovalWorkflow_name_organizationId_key";

-- DropIndex
DROP INDEX "CustomRole_name_organizationId_key";

-- DropIndex
DROP INDEX "Invitation_email_organizationId_key";

-- DropIndex
DROP INDEX "Media_organizationId_idx";

-- DropIndex
DROP INDEX "Membership_userId_organizationId_key";

-- AlterTable
ALTER TABLE "ApprovalWorkflow" DROP COLUMN "organizationId",
ADD COLUMN     "teamId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CustomRole" DROP COLUMN "organizationId",
ADD COLUMN     "teamId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "organizationId",
ADD COLUMN     "teamId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Media" DROP COLUMN "organizationId",
ADD COLUMN     "teamId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Membership" DROP COLUMN "organizationId",
ADD COLUMN     "teamId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "organizationId",
ADD COLUMN     "teamId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SocialAccount" DROP COLUMN "organizationId",
ADD COLUMN     "teamId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Organization";

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalWorkflow_name_teamId_key" ON "ApprovalWorkflow"("name", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRole_name_teamId_key" ON "CustomRole"("name", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_email_teamId_key" ON "Invitation"("email", "teamId");

-- CreateIndex
CREATE INDEX "Media_teamId_idx" ON "Media"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_teamId_key" ON "Membership"("userId", "teamId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalWorkflow" ADD CONSTRAINT "ApprovalWorkflow_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
