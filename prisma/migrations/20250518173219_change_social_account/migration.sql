/*
  Warnings:

  - You are about to drop the column `socialAccountId` on the `Post` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_socialAccountId_fkey";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "socialAccountId";

-- CreateTable
CREATE TABLE "PostSocialAccount" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "PostSocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostSocialAccount_postId_socialAccountId_key" ON "PostSocialAccount"("postId", "socialAccountId");

-- AddForeignKey
ALTER TABLE "PostSocialAccount" ADD CONSTRAINT "PostSocialAccount_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSocialAccount" ADD CONSTRAINT "PostSocialAccount_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
