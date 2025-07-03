-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subscriptionActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subscriptionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionUpdatedAt" TIMESTAMP(3);
