/*
  Warnings:

  - The values [TEAM_OWNER,CAMPAIGN_MANAGER,CONTENT_PRODUCER,CONTENT_REVIEWER,ANALYTICS_OBSERVER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('MANAGER', 'SUPERVISOR', 'CONTENT_CREATOR', 'INTERNAL_REVIEWER', 'CLIENT_REVIEWER', 'ANALYST', 'INBOX_AGENT');
ALTER TABLE "Invitation" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Membership" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Membership" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TABLE "Invitation" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TABLE "RolePermission" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "Invitation" ALTER COLUMN "role" SET DEFAULT 'CONTENT_CREATOR';
ALTER TABLE "Membership" ALTER COLUMN "role" SET DEFAULT 'CONTENT_CREATOR';
COMMIT;

-- AlterTable
ALTER TABLE "Invitation" ALTER COLUMN "role" SET DEFAULT 'CONTENT_CREATOR';

-- AlterTable
ALTER TABLE "Membership" ALTER COLUMN "role" SET DEFAULT 'CONTENT_CREATOR';
