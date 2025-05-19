-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "customRoleId" TEXT;

-- CreateTable
CREATE TABLE "CustomRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRolePermission" (
    "id" TEXT NOT NULL,
    "customRoleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "CustomRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomRole_name_organizationId_key" ON "CustomRole"("name", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRolePermission_customRoleId_permissionId_key" ON "CustomRolePermission"("customRoleId", "permissionId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRolePermission" ADD CONSTRAINT "CustomRolePermission_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRolePermission" ADD CONSTRAINT "CustomRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
