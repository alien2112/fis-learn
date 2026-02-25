-- Performance optimization: additional indexes for high-frequency query paths

-- CommunityMessage: index on (channel_id, is_pinned, created_at) for listMessages.
-- The existing (course_id, channel_id, created_at) index can't be used when the
-- query filters only by channel_id (without course_id). This index covers the
-- WHERE channel_id = ? ORDER BY is_pinned DESC, created_at DESC pattern.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "community_messages_channel_id_is_pinned_created_at_idx"
  ON "community_messages"("channel_id", "is_pinned" DESC, "created_at" DESC);

-- Session: index on expires_at for cleanup queries (delete expired sessions).
-- Without this index, DELETE FROM sessions WHERE expires_at < NOW() does a full scan.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "sessions_expires_at_idx"
  ON "sessions"("expires_at");

-- RefreshToken: index on expires_at for cleanup queries (delete expired tokens).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "refresh_tokens_expires_at_idx"
  ON "refresh_tokens"("expires_at");
