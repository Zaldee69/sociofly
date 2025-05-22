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

-- Step 1: Create the new Team table
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

-- Step 2: Copy all data from Organization to Team
INSERT INTO "Team" ("id", "name", "slug", "logo", "createdAt", "updatedAt", "ownerId")
SELECT "id", "name", "slug", "logo", "createdAt", "updatedAt", "ownerId"
FROM "Organization";

-- Step 3: Add new columns for foreign keys (not dropping the old ones yet)
ALTER TABLE "ApprovalWorkflow" ADD COLUMN "teamId" TEXT;
ALTER TABLE "CustomRole" ADD COLUMN "teamId" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "teamId" TEXT;
ALTER TABLE "Media" ADD COLUMN "teamId" TEXT;
ALTER TABLE "Membership" ADD COLUMN "teamId" TEXT;
ALTER TABLE "Post" ADD COLUMN "teamId" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN "teamId" TEXT;

-- Step 4: Set the new foreign keys to match the old ones
UPDATE "ApprovalWorkflow" SET "teamId" = "organizationId";
UPDATE "CustomRole" SET "teamId" = "organizationId";
UPDATE "Invitation" SET "teamId" = "organizationId";
UPDATE "Media" SET "teamId" = "organizationId";
UPDATE "Membership" SET "teamId" = "organizationId";
UPDATE "Post" SET "teamId" = "organizationId";
UPDATE "SocialAccount" SET "teamId" = "organizationId";

-- Step 5: Set NOT NULL constraints
ALTER TABLE "ApprovalWorkflow" ALTER COLUMN "teamId" SET NOT NULL;
ALTER TABLE "CustomRole" ALTER COLUMN "teamId" SET NOT NULL;
ALTER TABLE "Invitation" ALTER COLUMN "teamId" SET NOT NULL;
ALTER TABLE "Media" ALTER COLUMN "teamId" SET NOT NULL;
ALTER TABLE "Membership" ALTER COLUMN "teamId" SET NOT NULL;
ALTER TABLE "Post" ALTER COLUMN "teamId" SET NOT NULL;
ALTER TABLE "SocialAccount" ALTER COLUMN "teamId" SET NOT NULL;

-- Step 6: Drop old foreign key constraints
ALTER TABLE "ApprovalWorkflow" DROP CONSTRAINT "ApprovalWorkflow_organizationId_fkey";
ALTER TABLE "CustomRole" DROP CONSTRAINT "CustomRole_organizationId_fkey";
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_organizationId_fkey";
ALTER TABLE "Media" DROP CONSTRAINT "Media_organizationId_fkey";
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_organizationId_fkey";
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_ownerId_fkey";
ALTER TABLE "Post" DROP CONSTRAINT "Post_organizationId_fkey";
ALTER TABLE "SocialAccount" DROP CONSTRAINT "SocialAccount_organizationId_fkey";

-- Step 7: Drop old unique constraints and indexes
DROP INDEX "ApprovalWorkflow_name_organizationId_key";
DROP INDEX "CustomRole_name_organizationId_key";
DROP INDEX "Invitation_email_organizationId_key";
DROP INDEX "Media_organizationId_idx";
DROP INDEX "Membership_userId_organizationId_key";

-- Step 8: Create new unique constraints and indexes
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");
CREATE UNIQUE INDEX "ApprovalWorkflow_name_teamId_key" ON "ApprovalWorkflow"("name", "teamId");
CREATE UNIQUE INDEX "CustomRole_name_teamId_key" ON "CustomRole"("name", "teamId");
CREATE UNIQUE INDEX "Invitation_email_teamId_key" ON "Invitation"("email", "teamId");
CREATE INDEX "Media_teamId_idx" ON "Media"("teamId");
CREATE UNIQUE INDEX "Membership_userId_teamId_key" ON "Membership"("userId", "teamId");

-- Step 9: Create new foreign key constraints
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Media" ADD CONSTRAINT "Media_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalWorkflow" ADD CONSTRAINT "ApprovalWorkflow_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 10: Finally, drop the old columns and the Organization table
ALTER TABLE "ApprovalWorkflow" DROP COLUMN "organizationId";
ALTER TABLE "CustomRole" DROP COLUMN "organizationId";
ALTER TABLE "Invitation" DROP COLUMN "organizationId";
ALTER TABLE "Media" DROP COLUMN "organizationId";
ALTER TABLE "Membership" DROP COLUMN "organizationId";
ALTER TABLE "Post" DROP COLUMN "organizationId";
ALTER TABLE "SocialAccount" DROP COLUMN "organizationId";
DROP TABLE "Organization";
