-- Create unified posts and AI draft tables for auto-post feature
-- Run via Supabase migrations (this file is auto-applied by the CLI)

-- Ensure UUID generation is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Main posts table: blogs, news, and classifieds
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('blog', 'news', 'classify')),
  topic TEXT NOT NULL,
  description TEXT,
  content TEXT,
  slug TEXT UNIQUE,
  image_url TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional index helpers for queries
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts (type);
CREATE INDEX IF NOT EXISTS idx_posts_is_published ON posts (is_published);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts (published_at);

-- Simple updated_at trigger
CREATE OR REPLACE FUNCTION set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_posts'
  ) THEN
    CREATE TRIGGER set_timestamp_posts
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamp();
  END IF;
END;
$$;

-- AI-generated drafts table (temporary storage before publish)
CREATE TABLE IF NOT EXISTS post_drafts_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_post_id UUID REFERENCES posts (id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('blog', 'news', 'classify')),
  topic TEXT NOT NULL,
  description_prompt TEXT,
  content_draft TEXT,
  image_url_temp TEXT,
  metadata JSONB,
  suggested_time TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'accepted', 'rejected', 'posted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_drafts_ai_status ON post_drafts_ai (status);
CREATE INDEX IF NOT EXISTS idx_post_drafts_ai_created_by ON post_drafts_ai (created_by);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_post_drafts_ai'
  ) THEN
    CREATE TRIGGER set_timestamp_post_drafts_ai
    BEFORE UPDATE ON post_drafts_ai
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamp();
  END IF;
END;
$$;

-- Optional posting insights table for future optimization of best posting time
CREATE TABLE IF NOT EXISTS posting_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts (id) ON DELETE CASCADE,
  published_at TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('blog', 'news', 'classify')),
  performance_metrics JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posting_insights_post_id ON posting_insights (post_id);
CREATE INDEX IF NOT EXISTS idx_posting_insights_type ON posting_insights (type);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_drafts_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE posting_insights ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'Public can view published posts') THEN
    DROP POLICY "Public can view published posts" ON posts;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'Users can manage own posts') THEN
    DROP POLICY "Users can manage own posts" ON posts;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_drafts_ai' AND policyname = 'Users can manage own drafts') THEN
    DROP POLICY "Users can manage own drafts" ON post_drafts_ai;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posting_insights' AND policyname = 'Service role can manage insights') THEN
    DROP POLICY "Service role can manage insights" ON posting_insights;
  END IF;
END;
$$;

-- Policies for posts
CREATE POLICY "Public can view published posts"
ON posts
FOR SELECT
TO anon, authenticated
USING (
  is_published = TRUE
  AND (published_at IS NULL OR published_at <= NOW())
);

CREATE POLICY "Users can manage own posts"
ON posts
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Policies for AI drafts (only owners can access)
CREATE POLICY "Users can manage own drafts"
ON post_drafts_ai
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Posting insights typically managed by service role / backend jobs
CREATE POLICY "Service role can manage insights"
ON posting_insights
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

