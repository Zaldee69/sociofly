-- CreateTable
CREATE TABLE "MembershipGrant" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipDeny" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipDeny_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipGrant_membershipId_permissionId_key" ON "MembershipGrant"("membershipId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipDeny_membershipId_permissionId_key" ON "MembershipDeny"("membershipId", "permissionId");

-- AddForeignKey
ALTER TABLE "MembershipGrant" ADD CONSTRAINT "MembershipGrant_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipGrant" ADD CONSTRAINT "MembershipGrant_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipDeny" ADD CONSTRAINT "MembershipDeny_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipDeny" ADD CONSTRAINT "MembershipDeny_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
