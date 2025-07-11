-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TWITTER', 'LINKEDIN', 'TIKTOK', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MANAGER', 'SUPERVISOR', 'CONTENT_CREATOR', 'INTERNAL_REVIEWER', 'CLIENT_REVIEWER', 'ANALYST', 'INBOX_AGENT', 'OWNER');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BillingPlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('IMAGE', 'VIDEO', 'CAROUSEL', 'REELS', 'STORY', 'IGTV');

-- CreateEnum
CREATE TYPE "StoryType" AS ENUM ('IMAGE', 'VIDEO', 'BOOMERANG', 'SUPERZOOM', 'REWIND');

-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('BIO', 'POST', 'STORY', 'BUTTON', 'SWIPE_UP');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('POST_SCHEDULED', 'POST_PUBLISHED', 'POST_FAILED', 'COMMENT_RECEIVED', 'APPROVAL_NEEDED', 'APPROVAL_REQUEST', 'APPROVAL_APPROVED', 'APPROVAL_REJECTED', 'TOKEN_EXPIRED', 'ACCOUNT_DISCONNECTED', 'TEAM_MEMBER_JOINED', 'TEAM_MEMBER_LEFT', 'TEAM_INVITATION', 'WORKFLOW_ASSIGNED', 'ANALYTICS_READY', 'SYSTEM_MAINTENANCE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "subscriptionPlan" "BillingPlan" NOT NULL DEFAULT 'FREE',
    "subscriptionExpiresAt" TIMESTAMP(3),
    "subscriptionUpdatedAt" TIMESTAMP(3),
    "subscriptionActive" BOOLEAN NOT NULL DEFAULT false,
    "activeTeamId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CONTENT_CREATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "customRoleId" TEXT,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "platform" "SocialPlatform" NOT NULL,
    "profilePicture" TEXT,
    "profileId" TEXT,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "platform" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSocialAccount" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "platformPostId" TEXT,

    CONSTRAINT "PostSocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CONTENT_CREATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "teamId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hashtag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hashtag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskLog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT,

    CONSTRAINT "TaskLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRolePermission" (
    "id" TEXT NOT NULL,
    "customRoleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "CustomRolePermission_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "TemporaryData" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemporaryData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalWorkflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "ApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "role" "Role" NOT NULL,
    "assignedUserId" TEXT,
    "requireAllUsersInRole" BOOLEAN NOT NULL DEFAULT false,
    "externalReviewerEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workflowId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalInstance" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "workflowId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStepOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalAssignment" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "externalReviewerEmail" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostAnalytics" (
    "id" TEXT NOT NULL,
    "postSocialAccountId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "reactions" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timeToEngagement" INTEGER,
    "contentFormat" "ContentFormat",
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rawInsights" JSONB,

    CONSTRAINT "PostAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryAnalytics" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "exits" INTEGER NOT NULL DEFAULT 0,
    "forwards" INTEGER NOT NULL DEFAULT 0,
    "tapsNext" INTEGER NOT NULL DEFAULT 0,
    "tapsPrevious" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storyType" "StoryType" NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceInsights" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "gender" TEXT,
    "topCountry" TEXT,
    "topCity" TEXT,
    "percentage" DOUBLE PRECISION NOT NULL,
    "activeHours" JSONB NOT NULL,
    "activeDays" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudienceInsights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HashtagAnalytics" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "hashtag" TEXT NOT NULL,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "discovery" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isTop" BOOLEAN NOT NULL DEFAULT false,
    "rank" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HashtagAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostHashtagAnalytics" (
    "id" TEXT NOT NULL,
    "postAnalyticsId" TEXT NOT NULL,
    "hashtagAnalyticsId" TEXT NOT NULL,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PostHashtagAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkAnalytics" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "linkType" "LinkType" NOT NULL,
    "buttonType" TEXT,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "uniqueClicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourcePostId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementHotspot" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementHotspot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountAnalytics" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followersCount" INTEGER NOT NULL,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "mediaCount" INTEGER NOT NULL,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgReachPerPost" INTEGER NOT NULL DEFAULT 0,
    "avgLikesPerPost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgCommentsPerPost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgSharesPerPost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgSavesPerPost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFollowers" INTEGER DEFAULT 0,
    "totalPosts" INTEGER DEFAULT 0,
    "totalReach" INTEGER DEFAULT 0,
    "totalImpressions" INTEGER DEFAULT 0,
    "totalLikes" INTEGER DEFAULT 0,
    "totalComments" INTEGER DEFAULT 0,
    "totalShares" INTEGER DEFAULT 0,
    "totalSaves" INTEGER DEFAULT 0,
    "totalClicks" INTEGER DEFAULT 0,
    "avgEngagementPerPost" DOUBLE PRECISION DEFAULT 0,
    "avgClickThroughRate" DOUBLE PRECISION DEFAULT 0,
    "postsAnalyzed" INTEGER DEFAULT 0,
    "totalPostsOnPlatform" INTEGER DEFAULT 0,
    "bioLinkClicks" INTEGER DEFAULT 0,
    "storyViews" INTEGER DEFAULT 0,
    "profileVisits" INTEGER DEFAULT 0,
    "followerGrowth" JSONB NOT NULL,
    "unfollowCount" INTEGER NOT NULL DEFAULT 0,
    "previousFollowersCount" INTEGER DEFAULT 0,
    "previousMediaCount" INTEGER DEFAULT 0,
    "previousEngagementRate" DOUBLE PRECISION DEFAULT 0,
    "previousAvgReachPerPost" INTEGER DEFAULT 0,
    "followersGrowthPercent" DOUBLE PRECISION DEFAULT 0,
    "mediaGrowthPercent" DOUBLE PRECISION DEFAULT 0,
    "engagementGrowthPercent" DOUBLE PRECISION DEFAULT 0,
    "reachGrowthPercent" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "AccountAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostAnalyticsDemographics" (
    "id" TEXT NOT NULL,
    "postSocialAccountId" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "gender" TEXT,
    "location" TEXT,
    "percentage" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "postAnalyticsId" TEXT,

    CONSTRAINT "PostAnalyticsDemographics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "plan" "BillingPlan" NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "midtransToken" TEXT,
    "midtransOrderId" TEXT NOT NULL,
    "paymentDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_activeTeamId_idx" ON "User"("activeTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "Team_ownerId_idx" ON "Team"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_teamId_key" ON "Membership"("userId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSocialAccount_postId_socialAccountId_key" ON "PostSocialAccount"("postId", "socialAccountId");

-- CreateIndex
CREATE INDEX "Invitation_invitedBy_idx" ON "Invitation"("invitedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_email_teamId_key" ON "Invitation"("email", "teamId");

-- CreateIndex
CREATE INDEX "Media_teamId_idx" ON "Media"("teamId");

-- CreateIndex
CREATE INDEX "Media_userId_idx" ON "Media"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Hashtag_name_key" ON "Hashtag"("name");

-- CreateIndex
CREATE INDEX "Hashtag_category_idx" ON "Hashtag"("category");

-- CreateIndex
CREATE INDEX "Hashtag_frequency_idx" ON "Hashtag"("frequency");

-- CreateIndex
CREATE INDEX "TaskLog_name_idx" ON "TaskLog"("name");

-- CreateIndex
CREATE INDEX "TaskLog_status_idx" ON "TaskLog"("status");

-- CreateIndex
CREATE INDEX "TaskLog_executedAt_idx" ON "TaskLog"("executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permissionId_key" ON "RolePermission"("role", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRole_name_teamId_key" ON "CustomRole"("name", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRolePermission_customRoleId_permissionId_key" ON "CustomRolePermission"("customRoleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipGrant_membershipId_permissionId_key" ON "MembershipGrant"("membershipId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipDeny_membershipId_permissionId_key" ON "MembershipDeny"("membershipId", "permissionId");

-- CreateIndex
CREATE INDEX "TemporaryData_expiresAt_idx" ON "TemporaryData"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalWorkflow_name_teamId_key" ON "ApprovalWorkflow"("name", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStep_workflowId_order_key" ON "ApprovalStep"("workflowId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalAssignment_stepId_instanceId_assignedUserId_key" ON "ApprovalAssignment"("stepId", "instanceId", "assignedUserId");

-- CreateIndex
CREATE INDEX "PostAnalytics_postSocialAccountId_idx" ON "PostAnalytics"("postSocialAccountId");

-- CreateIndex
CREATE INDEX "PostAnalytics_recordedAt_idx" ON "PostAnalytics"("recordedAt");

-- CreateIndex
CREATE INDEX "PostAnalytics_engagement_idx" ON "PostAnalytics"("engagement");

-- CreateIndex
CREATE UNIQUE INDEX "PostAnalytics_postSocialAccountId_recordedAt_key" ON "PostAnalytics"("postSocialAccountId", "recordedAt");

-- CreateIndex
CREATE INDEX "StoryAnalytics_socialAccountId_idx" ON "StoryAnalytics"("socialAccountId");

-- CreateIndex
CREATE INDEX "StoryAnalytics_publishedAt_idx" ON "StoryAnalytics"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoryAnalytics_socialAccountId_storyId_key" ON "StoryAnalytics"("socialAccountId", "storyId");

-- CreateIndex
CREATE INDEX "AudienceInsights_socialAccountId_idx" ON "AudienceInsights"("socialAccountId");

-- CreateIndex
CREATE INDEX "AudienceInsights_recordedAt_idx" ON "AudienceInsights"("recordedAt");

-- CreateIndex
CREATE INDEX "HashtagAnalytics_socialAccountId_idx" ON "HashtagAnalytics"("socialAccountId");

-- CreateIndex
CREATE INDEX "HashtagAnalytics_hashtag_idx" ON "HashtagAnalytics"("hashtag");

-- CreateIndex
CREATE INDEX "HashtagAnalytics_isTop_idx" ON "HashtagAnalytics"("isTop");

-- CreateIndex
CREATE UNIQUE INDEX "HashtagAnalytics_socialAccountId_hashtag_recordedAt_key" ON "HashtagAnalytics"("socialAccountId", "hashtag", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostHashtagAnalytics_postAnalyticsId_hashtagAnalyticsId_key" ON "PostHashtagAnalytics"("postAnalyticsId", "hashtagAnalyticsId");

-- CreateIndex
CREATE INDEX "LinkAnalytics_socialAccountId_idx" ON "LinkAnalytics"("socialAccountId");

-- CreateIndex
CREATE INDEX "LinkAnalytics_linkType_idx" ON "LinkAnalytics"("linkType");

-- CreateIndex
CREATE INDEX "LinkAnalytics_recordedAt_idx" ON "LinkAnalytics"("recordedAt");

-- CreateIndex
CREATE INDEX "EngagementHotspot_socialAccountId_idx" ON "EngagementHotspot"("socialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "EngagementHotspot_socialAccountId_dayOfWeek_hourOfDay_key" ON "EngagementHotspot"("socialAccountId", "dayOfWeek", "hourOfDay");

-- CreateIndex
CREATE INDEX "AccountAnalytics_socialAccountId_idx" ON "AccountAnalytics"("socialAccountId");

-- CreateIndex
CREATE INDEX "AccountAnalytics_recordedAt_idx" ON "AccountAnalytics"("recordedAt");

-- CreateIndex
CREATE INDEX "PostAnalyticsDemographics_postSocialAccountId_idx" ON "PostAnalyticsDemographics"("postSocialAccountId");

-- CreateIndex
CREATE INDEX "PostAnalyticsDemographics_recordedAt_idx" ON "PostAnalyticsDemographics"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_midtransToken_key" ON "Transaction"("midtransToken");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_midtransOrderId_key" ON "Transaction"("midtransOrderId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_teamId_idx" ON "Notification"("teamId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_expiresAt_idx" ON "Notification"("expiresAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeTeamId_fkey" FOREIGN KEY ("activeTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSocialAccount" ADD CONSTRAINT "PostSocialAccount_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSocialAccount" ADD CONSTRAINT "PostSocialAccount_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRolePermission" ADD CONSTRAINT "CustomRolePermission_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRolePermission" ADD CONSTRAINT "CustomRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipGrant" ADD CONSTRAINT "MembershipGrant_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipGrant" ADD CONSTRAINT "MembershipGrant_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipDeny" ADD CONSTRAINT "MembershipDeny_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipDeny" ADD CONSTRAINT "MembershipDeny_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalWorkflow" ADD CONSTRAINT "ApprovalWorkflow_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalInstance" ADD CONSTRAINT "ApprovalInstance_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalInstance" ADD CONSTRAINT "ApprovalInstance_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAssignment" ADD CONSTRAINT "ApprovalAssignment_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAssignment" ADD CONSTRAINT "ApprovalAssignment_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ApprovalInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAssignment" ADD CONSTRAINT "ApprovalAssignment_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ApprovalStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAnalytics" ADD CONSTRAINT "PostAnalytics_postSocialAccountId_fkey" FOREIGN KEY ("postSocialAccountId") REFERENCES "PostSocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAnalytics" ADD CONSTRAINT "StoryAnalytics_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceInsights" ADD CONSTRAINT "AudienceInsights_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HashtagAnalytics" ADD CONSTRAINT "HashtagAnalytics_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostHashtagAnalytics" ADD CONSTRAINT "PostHashtagAnalytics_postAnalyticsId_fkey" FOREIGN KEY ("postAnalyticsId") REFERENCES "PostAnalytics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostHashtagAnalytics" ADD CONSTRAINT "PostHashtagAnalytics_hashtagAnalyticsId_fkey" FOREIGN KEY ("hashtagAnalyticsId") REFERENCES "HashtagAnalytics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkAnalytics" ADD CONSTRAINT "LinkAnalytics_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementHotspot" ADD CONSTRAINT "EngagementHotspot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementHotspot" ADD CONSTRAINT "EngagementHotspot_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountAnalytics" ADD CONSTRAINT "AccountAnalytics_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAnalyticsDemographics" ADD CONSTRAINT "PostAnalyticsDemographics_postAnalyticsId_fkey" FOREIGN KEY ("postAnalyticsId") REFERENCES "PostAnalytics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
