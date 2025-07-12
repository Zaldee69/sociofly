-- Optimize Post Queries Performance
-- Add database indexes for frequently used columns in post queries

-- Index for teamId (most common filter)
CREATE INDEX IF NOT EXISTS idx_post_team_id ON "Post" ("teamId");

-- Composite index for teamId + scheduledAt (calendar queries)
CREATE INDEX IF NOT EXISTS idx_post_team_scheduled ON "Post" ("teamId", "scheduledAt");

-- Index for scheduledAt ordering
CREATE INDEX IF NOT EXISTS idx_post_scheduled_at ON "Post" ("scheduledAt");

-- Composite index for teamId + status (filtered queries)
CREATE INDEX IF NOT EXISTS idx_post_team_status ON "Post" ("teamId", "status");

-- Composite index for teamId + platform (platform-specific queries)
CREATE INDEX IF NOT EXISTS idx_post_team_platform ON "Post" ("teamId", "platform");

-- Index for PostSocialAccount queries
CREATE INDEX IF NOT EXISTS idx_post_social_account_post_id ON "PostSocialAccount" ("postId");
CREATE INDEX IF NOT EXISTS idx_post_social_account_social_id ON "PostSocialAccount" ("socialAccountId");

-- Index for SocialAccount team queries
CREATE INDEX IF NOT EXISTS idx_social_account_team_id ON "SocialAccount" ("teamId");

-- Analyze tables to update statistics
ANALYZE "Post";
ANALYZE "PostSocialAccount";
ANALYZE "SocialAccount";