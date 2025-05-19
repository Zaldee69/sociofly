/*
  Warnings:

  - The values [ADMIN,EDITOR,VIEWER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('TEAM_OWNER', 'CAMPAIGN_MANAGER', 'CONTENT_PRODUCER', 'CONTENT_REVIEWER', 'CLIENT_REVIEWER', 'ANALYTICS_OBSERVER', 'INBOX_AGENT');
ALTER TABLE "Invitation" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Membership" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Membership" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TABLE "Invitation" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "Invitation" ALTER COLUMN "role" SET DEFAULT 'CONTENT_PRODUCER';
ALTER TABLE "Membership" ALTER COLUMN "role" SET DEFAULT 'CONTENT_PRODUCER';
COMMIT;

-- AlterTable
ALTER TABLE "Invitation" ALTER COLUMN "role" SET DEFAULT 'CONTENT_PRODUCER';

-- AlterTable
ALTER TABLE "Membership" ALTER COLUMN "role" SET DEFAULT 'CONTENT_PRODUCER';

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permissionId_key" ON "RolePermission"("role", "permissionId");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
