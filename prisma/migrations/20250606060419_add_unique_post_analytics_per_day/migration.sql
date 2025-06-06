/*
  Warnings:

  - A unique constraint covering the columns `[postSocialAccountId,recordedAt]` on the table `PostAnalytics` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PostAnalytics_postSocialAccountId_recordedAt_key" ON "PostAnalytics"("postSocialAccountId", "recordedAt");
